---
title: "Google Code Playground - Path Traversal"
date: "2014-04-07"
---

There's already been some traffic here so let me describe one of my earliest bugs I've reported to Google Security Team.

Last August, I had a brief look at [Google Code Playground](https://code.google.com/apis/ajax/playground/) site. I was looking for some client side issues like XSS or CSRF but my attention was caught by the copyright notice on every subpage.

![Screenshot showing a snippet of the Apache License](/screen1.png)

As it's licensed on Apache License, which is an open source one, perhaps it's possible to find some sources? My intuition [proved correct](https://code.google.com/p/google-ajax-examples/source/browse/trunk/interactive_samples/boilerplateProxy.py?r=534) and so I started to examine of what I could find.

Have a look at this file https://code.google.com/p/google-ajax-examples/source/browse/trunk/interactive_samples/boilerplateProxy.py?r=534:

```python
path = self.request.path
path = path[1:] # 1.
path = path.replace('apis/ajax/playground/', '') # 2.
# (...)
path = os.path.join(os.path.dirname(__file__), path) #3.

self.response.out.write(template.render(path, self.template_values))
```

Can you spot an issue here? :) Suppose the request path is `/apis/ajax/playground/samples/test.html` and the OS path is `/base/data/home/apps/s~app/1.34/`. Let's examine what the script will actually do:

1. Strip the first character from request path. Result: `apis/ajax/playground/samples/test.html`.
2. Delete all occurences of `apis/ajax/playground/`. So `apis/ajax/playground/samples/test.html` => `samples/test.html`.
3. Concatenate the path with OS path. Result: `/base/data/home/apps/s~app/1.34/samples/test.html`.
4. Write contents of the file in the output.

So far so good. But what's gonna happen when we'll issue a request with path `/apis/ajax/playground/samples/..apis/ajax/playground//main.py`? Let's find out.

1. Strip the first character. `apis/ajax/playground/samples/..apis/ajax/playground//main.py`.
2. Delete all occurences of `apis/ajax/playground`. `apis/ajax/playground/samples/..apis/ajax/playground//main.py` => `samples/../main.py`. Oops! Bare double dot spotted!
3. Concatenate it with OS path. `/base/data/home/apps/s~app/1.34/samples/../main.py`, while the effective path is `/base/data/home/apps/s~app/1.34/main.py`.
4. Now we can read `main.py` output in http response.

Unfortunately I have no screenshots but I hope you get the idea.

The issue was reported to Google on 22nd August 2013 and was fixed within the same day. You can verify that by checking [the diff](https://code.google.com/p/google-ajax-examples/source/diff?spec=svn572&r=572&format=side&path=/trunk/interactive_samples/boilerplateProxy.py&old_path=/trunk/interactive_samples/boilerplateProxy.py&old=534).

Big thanks to Google Security Team for running their [bounty program](http://www.google.pl/about/appsecurity/reward-program/), which is a great way to enhance one's skills.
