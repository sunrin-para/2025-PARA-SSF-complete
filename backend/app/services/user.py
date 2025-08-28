from typing import List
from utils import JsonHandler

class UserService():
    def __init__(self):
        self.json_handler = JsonHandler("./data/preferences.json", [])
        self.user = self.json_handler.read()

    def update_preferences(self, moods: List[str], genres: List[str], countries: List[str]):
        try:
            self.user = {
                "moods": moods or self.user.get("moods", []),
                "genres": genres or self.user.get("genres", []),
                "countries": countries or self.user.get("countries", [])
            }
            self.json_handler.write(self.user)
            return "success"
        except Exception as e:
            raise Exception(str(e))

    def reset(self):
        try:
            self.user = {"moods": [], "genres": [], "countries": []}
            self.json_handler.write(self.user)
            return "success"
        except Exception as e:
            raise Exception(str(e))
