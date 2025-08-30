import os, json, time, random, spotipy
from typing import List, Dict
from spotipy.oauth2 import SpotifyClientCredentials
from openai import OpenAI
from prompts import PromptHandler
from utils import JsonHandler

class Pipeline():
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_KEY"))
        self.prompt_handler = PromptHandler()

    def parsed_chat(self, preferences: Dict[str, List], prompt: str):
        return [
            {"role": "system", "content": prompt},
            {"role": "user", "content": str(preferences)}
        ]

    def parsed_response(self, response: str):
        try:
            return json.loads(response.strip())
        except:
            start = response.find("[")
            end = response.rfind("]") + 1
            if '[' in response and end > start:
                try:
                    return json.loads(response[start:end])
                except:
                    pass
        return []

    def generate_keywords(self, preferences: Dict[str, List]):
        chat = self.parsed_chat(preferences, self.prompt_handler.keyword_prompt)
        response = self.client.chat.completions.create(model="gpt-4o-mini", messages=chat)
        return self.parsed_response(response.choices[0].message.content)

class SpotifyHandler:
    def __init__(self):
        client_credentials_manager = SpotifyClientCredentials(
            client_id=os.getenv("SPOTIFY_ID"),
            client_secret=os.getenv("SPOTIFY_SECRET")
        )
        self.spotify = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

    def search_playlists(self, query: str, limit: int = 10):
        response = self.spotify.search(q=query, type="playlist", limit=limit)
        playlists = []
        for playlist in response["playlists"]["items"]:
            if playlist:
                playlists.append({
                    "id": playlist["id"],
                    "name": playlist["name"],
                    "url": playlist["href"]
                })
        return random.sample(playlists, min(3, len(playlists)))

    def get_tracks(self, playlist_id: str):
        response = self.spotify.playlist_tracks(playlist_id)
        tracks = []
        for item in response["items"]:
            if item["track"]:
                try:
                    track = item["track"]
                    artists = []
                    for artist in track['artists']:
                        artists.append({
                            'id': artist['id'],
                            'name': artist['name'],
                            'url': artist['external_urls']['spotify']
                        })
                    thumbnail = None
                    if track["album"]["images"]:
                        thumbnail = track["album"]["images"][0]["url"]
                    tracks.append({
                        'id': track['id'],
                        'name': track['name'],
                        "url": track["external_urls"]["spotify"],
                        'duration': track['duration_ms'],
                        'artists': artists,
                        "thumbnail": thumbnail
                    })
                except:
                    continue
        return tracks

class PlaylistService():
    def __init__(self):
        self.json_handler = JsonHandler("./data/playlist.json")
        self.pipeline = Pipeline()

    def collect_tracks_from_playlist(self, playlist, total_tracks, track_length):
        if len(total_tracks) >= track_length:
            return False

        spotify_handler = SpotifyHandler()
        tracks = spotify_handler.get_tracks(playlist["id"])

        for track in tracks:
            if len(total_tracks) >= track_length:
                break
            total_tracks[track["id"]] = track

        return True

    def generate_playlist(self, track_length: int):
        try:
            sources = []
            total_tracks = {}
            spotify_handler = SpotifyHandler()

            preferences = JsonHandler("./data/preferences.json").read()
            keywords = self.pipeline.generate_keywords(preferences)

            for keyword in keywords:
                if len(total_tracks) >= track_length:
                    break

                playlists = spotify_handler.search_playlists(keyword)
                sources.extend(playlists)

                for playlist in playlists:
                    should_continue = self.collect_tracks_from_playlist(playlist, total_tracks, track_length)
                    if not should_continue:
                        break

            available_tracks = list(total_tracks.values())
            selected_tracks = random.sample(available_tracks, min(track_length, len(available_tracks)))

            playlist = {"tracks": selected_tracks, "sources": sources}
            self.json_handler.write(playlist)

            return playlist
        except Exception as e:
            raise Exception(str(e))

    def get(self):
        try:
            return self.json_handler.read()
        except Exception as e:
            raise Exception(str(e))

    def reset(self):
        try:
            self.json_handler.write({"tracks": [], "sources": []})
            return "success"
        except Exception as e:
            raise Exception(str(e))
