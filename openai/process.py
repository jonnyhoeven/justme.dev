import os
import pickle
import requests
import textwrap
import yaml
from dotenv import load_dotenv
from openai import OpenAI


class MLResponseHandler:
    def __init__(self):
        load_dotenv()
        self.req_path = os.environ['REQUEST_PATH']
        self.api_key = os.environ['OPENAI_API_KEY']
        self.api_url = os.environ['API_URL']
        self.max_width = 120

        if os.environ['API_URL']:
            print(f'Enabling OpenAI client...')
            self.client = OpenAI(api_key=self.api_key, base_url=self.api_url)

    def get_readme(self, user, project, branch, readme_file):
        if not all([user, project, readme_file]):
            print(f'Warning: Missing user, project, or readme_file')
            return ''
        url = f'https://raw.githubusercontent.com/{user}/{project}/{branch}/{readme_file}'
        response = requests.get(url)
        if response.status_code != 200:
            print(f'Error: No 200 response {url}')
            return ''
        return response.text

    def load_ml_response(self, response_path):
        with open(response_path, 'rb') as file:
            return pickle.load(file)

    def retrieve_ml_response(self, model, messages):
        return self.client.chat.completions.create(model=model, messages=messages)

    @staticmethod
    def parse_ml_response(response):
        data = dict()
        message = response.choices[0].message.content
        if 'Blog blog:' in message:
            data['intro'] = message.split('Blog Post:')[0].split('Intro:')[1].strip()
            data['post'] = message.split('Blog Post:')[1].strip()
        else:
            data['post'] = message
        data['total_tokens'] = response.usage.total_tokens
        return data

    def save_ml_response(self, path, response):
        with open(path, 'wb') as file:
            pickle.dump(response, file)

    def process_requests(self):
        for req_file in [f for f in os.listdir(self.req_path) if
                         os.path.isfile(os.path.join(self.req_path, f)) and f.endswith('.yaml')]:
            print(f'Loading {req_file}')
            req_file_path = os.path.join(self.req_path, req_file)
            with open(req_file_path, 'r') as file:
                request = yaml.safe_load(file)
            if not request:
                print(f'Error loading {req_file_path}')
                break
            if not request['type']:
                print(f'Error: Missing type in {req_file_path}')
                break
            self.process_request(request, req_file)

    def process_request(self, request, req_file):
        my_wrap = textwrap.TextWrapper(width=self.max_width)
        basename = req_file.split('.')[0]
        res_path = f'openai/response/{basename}.bin'
        dst_path = f'{request["type"]}s/{basename}.md'
        readme = ''
        post = ''
        res = {}
        print(f'Processing {basename}')
        if request.get('fetchReadme', False):
            readme = self.get_readme(request['user'], request['project'], request['branch'], request['readmeFile'])
        if request.get('fetchML', False):

            if os.path.isfile(res_path):
                res = self.load_ml_response(res_path)
            else:
                print(f'Fetching response from api: {res_path}')
                if not request['model'] or not request['messages']:
                    print(f'Error: Missing model or messages in {req_file}')
                    return
                res = self.retrieve_ml_response(request['model'], request['messages'])
                self.save_ml_response(res_path, res)
            if res:
                ml_res = self.parse_ml_response(res)
                request['total_tokens'] = ml_res['total_tokens']
                request['intro'] = ml_res['intro']
                post = ml_res['post']
        self.save_post(request, dst_path, post, readme, my_wrap)

    @staticmethod
    def save_post(request, dst_path, post, readme, my_wrap):
        print(f'Saving to {dst_path}')
        with open(dst_path, 'w') as pst_file:
            pst_file.write('---\n' +
                           yaml.safe_dump(request, width=120) +
                           '---\n' +
                           '<script setup>\n' +
                           " import ArticleItem from '/components/ArticleItem.vue';\n" +
                           " import ArticleFooter from '/components/ArticleFooter.vue';\n" +
                           '</script>\n' +
                           '<ArticleItem :frontmatter="$frontmatter"/>\n' +
                           my_wrap.fill(post) + '\n' +
                           readme + '\n\n' +
                           '<ArticleFooter :frontmatter="$frontmatter"/>\n'
                           )


if __name__ == "__main__":
    handler = MLResponseHandler()
    handler.process_requests()
