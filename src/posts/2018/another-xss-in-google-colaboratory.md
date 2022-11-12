---
title: "Another XSS in Google Colaboratory"
date: "2018-09-20"
---

Three months ago, I wrote a blog post in which I described an [XSS I found in Google Colaboratory](/2018/06/xss-in-google-colaboratory-csp-bypass.html). In this post, I will expand the topic and show you another XSS I identified in the same application, which is directly related to the previous.

I suggest you to have a look at the previous post before reading this one, but here's an overview of what happened last time:

- I analyzed an application called [Google Colaboratory](https://colab.research.google.com/) for XSS-es,
- I found that the application make use of a library called [MathJax](https://github.com/mathjax/MathJax) to render LaTeX code,
- I found an XSS in MathJax, abusing `\unicode{}` LaTeX macro.

Looking from a technical standpoint, the error was not in MathJax itself, but in the plugin, which was enabled by default, called _Assistive MathML_. Before MathJax author fixed the bug, Google got rid of the XSS by just disabling the plugin. This is a pretty sane approach as the root cause of the XSS is eliminated, right?...

Well, that's true, unless there is a way to re-enable the plugin!

Once, I gave Google Colaboratory another shot and checked for other XSS-es. I noticed an interesting behaviour: when I press the right click on the LaTeX macro generated in the MarkDown, I get a standard Colaboratory popup-menu. However, when I right-click on the table of contents, I get a menu of MathJax! See that below:

[![](https://3.bp.blogspot.com/-YgU8-vnZZqQ/W6QCB90BynI/AAAAAAAAARU/3Mheo9bippQtA6AEhN0MqMZJ3HxegAchQCK4BGAYYCw/s1600/ezgif-3-47d19bf6b0.gif)](http://3.bp.blogspot.com/-YgU8-vnZZqQ/W6QCB90BynI/AAAAAAAAARU/3Mheo9bippQtA6AEhN0MqMZJ3HxegAchQCK4BGAYYCw/s1600/ezgif-3-47d19bf6b0.gif)

"Why did it matter" - you might ask. Well, it turned out that it is possible to re-enable the _Assistive MathML_ plugin!

[![](https://4.bp.blogspot.com/-glfUTVn4cVc/W6QCeU8gQuI/AAAAAAAAARo/9a3SP4rYxWsxD0yVzKugaotCFnCWiD-vQCK4BGAYYCw/s400/mathmll.png)](http://4.bp.blogspot.com/-glfUTVn4cVc/W6QCeU8gQuI/AAAAAAAAARo/9a3SP4rYxWsxD0yVzKugaotCFnCWiD-vQCK4BGAYYCw/s1600/mathmll.png)

And when I did that, my old method of XSS, for example using: `$ \unicode {41<img src=1 onerror=alert(document.domain)>} $` started working again.

[![](https://3.bp.blogspot.com/-kqscsr0l9IM/W6QC07PF-0I/AAAAAAAAAR4/QVOmc5sAfowDIjfsG2Vljk6jQGWccLktACK4BGAYYCw/s400/xssmathjax.png)](http://3.bp.blogspot.com/-kqscsr0l9IM/W6QC07PF-0I/AAAAAAAAAR4/QVOmc5sAfowDIjfsG2Vljk6jQGWccLktACK4BGAYYCw/s1600/xssmathjax.png)

The question that I still had to ask was: is it possible to make the XSS fire for another user? Which demands a follow-up question: where does MathJax store information about re-enabled _Assistive MathML_?

The answer was pretty good for me, as it was stored in a cookie. I noticed the following cookie: `mjx.menu=assistiveMML%3Atrue`. It is a great news since cookies might be set across subdomain. I wrote about another example of XSS via cookie four years ago in a blog post: [Gmail and Google+ - tale of two XSS-es](/2014/06/gmail-and-google-tale-of-two-xss-es.html). So here's the attack scenario:

1. We have an XSS on any other Google subdomain, for instance: some-random-domain.google.com,
2. From that domain, we set the cookie: `document.cookie="mjx.menu=assistiveMML%3atrue; Domain=.google.com; Path=/"`
3. Now, the `mjx.menu` cookie is being sent with every request to any Google subdomain.

I simulated the attack, by defining some-random-domain.google.com in /etc/hosts and then using the following code:

```html
<!DOCTYPE html><meta charset="utf-8" />

<button onclick="exploit()" style="font-size:48px">
  Set cookie and redirect to Colaboratory!
</button>

<script>
  function exploit() {
    const COLAB_URL =
      "https://colab.research.google.com/notebooks/welcome.ipynb";

    document.cookie =
      "mjx.menu=assistiveMML%3atrue; Domain=.google.com; Path=/";

    location = COLAB_URL;
  }
</script>
```

The result? Below:

[![](https://1.bp.blogspot.com/-pyy_wEkmVgs/W6QEbifESfI/AAAAAAAAASE/bRt8rqXaPjYlTjQj-YUQEpHFCif-aTB9QCK4BGAYYCw/s640/ezgif-3-5ed330b6ba.gif)](http://1.bp.blogspot.com/-pyy_wEkmVgs/W6QEbifESfI/AAAAAAAAASE/bRt8rqXaPjYlTjQj-YUQEpHFCif-aTB9QCK4BGAYYCw/s1600/ezgif-3-5ed330b6ba.gif)

I think the most important conclusion from the above bug is that a special care must be given, when auditing any external JS libraries, to their storage mechanisms (like cookies or localStorage). In case of MathJax, the preferences in cookies overloaded the ones defined when loading the library.
