class PromptHandler:
    def __init__(self):
        self.functions_prompt = self.read_file('./prompts/function.md')
        self.chat_prompt = self.read_file('./prompts/talk.md')
        self.keyword_prompt = self.read_file('./prompts/keyword.md')

    def read_file(self, file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
