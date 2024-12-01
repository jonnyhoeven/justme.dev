import os
import requests
import textwrap
import yaml


class GenerateFiles:
    def __init__(self):
        self.max_width = 120
        self.req_path = "generate/requests"
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
        dst_path = f'{request["type"]}s/{basename}.md'
        readme = ''
        post = ''
        print(f'Processing {basename}')
        if request.get('fetchReadme', False):
            readme = self.get_readme(request['user'], request['project'], request['branch'], request['readmeFile'])

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
    handler = GenerateFiles()
    handler.process_requests()
