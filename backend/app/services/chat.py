import os, json, time
from typing import List, Dict, Optional
from openai import OpenAI
from prompts import PromptHandler
from utils import JsonHandler

class Pipeline():
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_KEY"))
        self.prompt_handler = PromptHandler()

    def build_chat_with_system(self, chat: List[Dict], system_prompt: str):
        new_chat = []
        for msg in chat:
            if msg["role"] != "system":
                new_chat.append(msg)
        chat = new_chat
        t = chat.pop()
        chat.append({"role": "system", "content": system_prompt})
        chat.append(t)
        return chat

    def parsed_response(self, response: str):
        try:
            return json.loads(response.strip())
        except:
            start = response.find('[')
            end = response.rfind(']') + 1
            if '[' in response and end > start:
                try:
                    return json.loads(response[start:end])
                except:
                    pass
        return []

    def get_completion(self, chat: List[Dict]) -> str:
        response = self.client.chat.completions.create(model="gpt-4o-mini", messages=chat)
        return response.choices[0].message.content

    def select_functions(self, chat: List[Dict]):
        chat_with_system = self.build_chat_with_system(chat.copy(), self.prompt_handler.functions_prompt)
        response = self.get_completion(chat_with_system)
        return self.parsed_response(response)

    def generate_message(self, chat: List[Dict]) -> str:
        chat_with_system = self.build_chat_with_system(chat.copy(), self.prompt_handler.chat_prompt)
        return self.get_completion(chat_with_system)

class ChatService():
    def __init__(self):
        self.json_handler = JsonHandler("./data/chat.json", [])
        self.chat = self.json_handler.read()
        self.pipeline = Pipeline()

    def save_chat(self):
        self.json_handler.write(self.chat)

    def generate_playlist(self):
        for i in range(len(self.chat)):
            if self.chat[i]["role"] == "system" and self.chat[i]["content"] == "playlist_ui":
                self.chat[i]["content"] = "generate_playlist"
        self.chat.append({"role": "system", "content": "playlist_ui"})
        self.save_chat()

    def update_preferences(self):
        self.chat.append({"role": "system", "content": "update_preferences"})
        self.save_chat()

    def add_message(self, role: str, content: str, created_at: Optional[int] = None):
        message = {
            "role": role,
            "content": content,
            "created_at": created_at or int(time.time())
        }
        self.chat.append(message)
        return message

    def get_functions(self, role: str, message: str, created_at: Optional[int] = None):
        try:
            self.add_message(role, message, created_at)
            functions = self.pipeline.select_functions(self.chat)
            self.save_chat()
            return functions
        except Exception as e:
            raise Exception(str(e))

    def generate_message(self):
        try:
            content = self.pipeline.generate_message(self.chat)
            message = self.add_message("assistant", content)
            self.save_chat()
            return message
        except Exception as e:
            raise Exception(str(e))

    def get(self):
        try:
            self.chat = self.json_handler.read()
            return self.chat
        except Exception as e:
            raise Exception(str(e))

    def reset(self):
        try:
            self.chat = []
            self.save_chat()
        except Exception as e:
            raise Exception(str(e))
