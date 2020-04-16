from jinja2 import Environment, FileSystemLoader, select_autoescape


def covid_visual_index(req):

    env = Environment(
        loader=FileSystemLoader('../src'),
        autoescape=select_autoescape(['html', 'xml'])
    )

    template = env.get_template('index.html')
    return template.render()
