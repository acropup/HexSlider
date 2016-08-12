import sys, os
import web
import json
base_path = os.path.dirname(__file__)
sys.path.append(base_path)

# Manage routing from here. Regex matches URL and chooses class by name
urls = (
    '/', 'Home',
)
render = web.template.render(base_path)
app = web.application(urls, globals())

class Home:
    def GET(self):
        return render.index()


# For development testing, uncomment these 3 lines
if __name__ == "__main__":
    app.run()
