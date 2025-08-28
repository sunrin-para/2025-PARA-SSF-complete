import os, json
from typing import Union, List, Dict

class JsonHandler():
    def __init__(self, path: str, exist_data: Union[List, Dict]={}):
        self.path = path
        if not os.path.isfile(path):
            with open(self.path, "w", encoding="UTF-8") as f:
                json.dump(exist_data, f, ensure_ascii=False, indent="\t")

    def read(self):
        with open(self.path, "r", encoding="UTF-8") as f:
            return json.load(f)

    def write(self, data: Union[List, Dict]):
        with open(self.path, "w", encoding="UTF-8") as f:
            json.dump(data, f, ensure_ascii=False, indent="\t")
