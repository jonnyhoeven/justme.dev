from os import listdir, linesep
from os.path import isfile
from os.path import join
import yaml
import pickle
import requests
import textwrap
from dotenv import dotenv_values
from openai import OpenAI

config = dotenv_values('.env')
req_path = config['REQUEST_PATH']
api_key = config['API_KEY']
api_url = config['API_URL']
yaml_file_delim = '---'
max_width = 120

client = OpenAI(
    api_key=api_key,
    base_url=api_url
)


def get_readme(githost, user, project, branch, readme_file):
    if githost \
            and user \
            and project \
            and readme_file:
        u = f'{githost}/{user}/{project}/{branch}/{readme_file}'
        r = requests.get(u)
        if r.status_code != 200:
            print(f'Error: No 200 response {u}')
            return ''
        return r.text
    else:
        print(f'Warning: Missing githost, user, project, or readme_file')
        return ''


def load_ml_response(rp):
    with open(rp, 'rb') as f:
        return pickle.load(f)


def retrieve_ml_response(model, messages):
    return client.chat.completions.create(
        model=model,
        messages=messages,
    )


def parse_ml_response(r):
    d = dict()
    m = r.choices[0].message.content
    if len(m.split('Blog Post:')) >= 1:
        if len(m.split('Blog Post:')[0].split('Intro:')) >= 1:
            d['intro'] = m.split('Blog Post:')[0].split('Intro:')[1].strip()
        d['post'] = m.split('Blog Post:')[1].strip()
    else:
        d['post'] = m

    d['total_tokens'] = res.usage.total_tokens
    return d


def save_ml_response(p, r):
    with open(p, 'wb') as f:
        pickle.dump(r, f)
    f.close()


for file in [f for f in listdir(req_path) if isfile(join(req_path, f))]:
    #  Load request file
    rqPath = join(req_path, file)
    with open(rqPath, 'r') as f:
        req = yaml.safe_load(f)
    if not req:
        print(f'Error loading {rqPath}')
        break
    if not req['type']:
        print(f'Error: Missing type in {rqPath}')
        break

    my_wrap = textwrap.TextWrapper(width=120)
    basename = file.split('.')[0]
    resPath = f'openai/response/{basename}.bin'
    dst_path = f'{req["type"]}/{basename}.md'
    readme = ''
    post = ''
    res = {}
    print(f'Processing {basename}')

    #  Fetch Readme
    if req.get('fetchReadme', False):
        readme = get_readme(req['githost'], req['user'], req['project'], req['branch'], req['readmeFile'])

    if req.get('fetchML', False):
        if isfile(resPath):
            res = load_ml_response(resPath)
        else:
            print(f'Fetching response from api: {resPath}')
            if not req['model'] or not req['messages']:
                print(f'Error: Missing model or messages in {rqPath}')
                break
            res = retrieve_ml_response(req['model'], req['messages'])
            save_ml_response(resPath, res)

        if res:
            ml_res = parse_ml_response(res)
            req['total_tokens'] = ml_res['total_tokens']
            req['intro'] = ml_res['intro']
            post = ml_res['post']

    print(f'Saving {basename} to {dst_path}')
    with open(dst_path, 'w') as pstFile:
        pstFile.write(yaml_file_delim + linesep +
                      yaml.safe_dump(req, width=max_width) +
                      yaml_file_delim + linesep +
                      '<script setup>' + linesep +
                      " import ArticleItem from '/components/ArticleItem.vue';" + linesep +
                      " import ArticleFooter from '/components/ArticleFooter.vue';" + linesep +
                      '</script>' + linesep +
                      '<ArticleItem :frontmatter="$frontmatter"/>' + linesep + linesep +
                      my_wrap.fill(post) + linesep +
                      readme + linesep + linesep +
                      '<ArticleFooter :frontmatter="$frontmatter"/>' + linesep
                      )
        pstFile.close()
