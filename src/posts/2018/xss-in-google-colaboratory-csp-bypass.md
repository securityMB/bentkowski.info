---
title: "XSS in Google Colaboratory + CSP bypass"
date: "2018-06-21"
---

In this note, I describe an interesting XSS that I found in February 2018 in one of the Google applications. I won't only show directly where the XSS was, but it's also a case sudy of what attempts I made to find it and what dead ends I needed to overcome. In addition, I'm showing a Content-Security-Policy bypass using _script gadgets_.

### What is Google Colaboratory

The app I chose for testing was [Google Colaboratory](https://colab.research.google.com/). It is based on another known application, called [Jupyter Notebook](http://jupyter.org/). Colaboratory allows creating documents containing both text (formatted in markdown) and code (Python 2 or 3). The code is executed in the Google Cloud, and its result is placed directly in the document. This can be useful in scientific purposes, where you can prepare a set of data and a code that processes the data in some way, e.g. performs calculations on them or generates plots or Venn diagrams. Such examples are also shown on the Colaboratory main page.

[![](https://4.bp.blogspot.com/-HacCPv8KRNA/Wyvg89rrmDI/AAAAAAAAAN4/Cxd0xB_7Wps8E8zV9jG4syU8Z9j0oqipQCK4BGAYYCw/s320/rys1.png)](http://4.bp.blogspot.com/-HacCPv8KRNA/Wyvg89rrmDI/AAAAAAAAAN4/Cxd0xB_7Wps8E8zV9jG4syU8Z9j0oqipQCK4BGAYYCw/s1600/rys1.png)

As usual, I focused on looking for XSS and other related bugs.

As I mentioned earlier, Colaboratory used Markdown syntax. Markdown is very popular these days, for example you can write \*\*two asterisks\*\* for bold text or \*one asterisk\* for italics

[![](https://3.bp.blogspot.com/-LatwBUcGkWI/WyvhENs5PlI/AAAAAAAAAOA/cixkX8BV6F8g16JuK3vZFq1-pjn9bgHGQCK4BGAYYCw/s400/rys2.png)](http://3.bp.blogspot.com/-LatwBUcGkWI/WyvhENs5PlI/AAAAAAAAAOA/cixkX8BV6F8g16JuK3vZFq1-pjn9bgHGQCK4BGAYYCw/s1600/rys2.png)

Interestingly, most Markdown parsers allow you to use HTML syntax directly. Colaboratory was no different. For example, when I wrote the following code:

```
This is <strong>bold</strong>
```

Then, what I saw in the DOM tree was:

```
This is <strong>bold</strong>
```

So let's start with a very basic XSS code, that almost look too easy to just work:

```
Test<img src=1 onerror=alert(1)>
```

The DOM tree looked however like this:

```
Test<img src="1">
```

This means that Colaboratory uses some kind of HTML sanitizer that strips it from dangerous code (e.g. from the `onerror` event). I found out what kind of library was used a little bit later.

So let's try with something else altogether. A very common way to inject JS code in Markdown parsers is to use hyperlinks with javascript: protocol. For example, the code:

```
[CLICK](javascript:alert(1))
```

Should be changed to:

```
<a href="javascript:alert(1)">CLICK</a>
```

In Colaboratory, however, nothing happened. When I used a protocol other than http or https, the HTML didn't conain a link. I noticed, however, that links were created, even if the URL did not contain a correct domain, e.g.

```
[CLICK](https://aaa$$$\*\*bbbb)
```

The above code has been changed to:

```
<a href="https://aaa$$$\*\*bbbb">CLICK</a>
```

This made me assume that URL verification is done with a simple regular expression. Because Markdown is parsed in JavaScript code in Colaboratory, I started browsing the .js files of the application in search of this regex. The following code was found quite quickly:

```
        return qd(b ? a : "about:invalid#zClosurez")
    }
      , sd = /^(?:(?:https?|mailto|ftp):|\[^:/?#\]\*(?:\[/?#\]|$))/i
```

The selected line is the regular expression that validates the URL in the links. I had a closer look at it more closely but I didn't manage to find any bypass. The time spent searching for it, however, wasn't wasted. I thought that since I found a place that verifies the correctness of links, maybe somewhere nearby I will find a code that sanitizes the HTML? In other words, I should be able to find the function that removed the onerror event before. My intuition didn't fail me and several lines further, I found the following gem:

```
var Fm = xk("goog.html.sanitizer.SafeDomTreeProcessor")
```

Quick googling revealed that goog.html.sanitizer.SafeDomTreeProcessor is a part of [Google Closure library](https://github.com/google/closure-library/tree/master/closure/goog/html/sanitizer). It contains both a [whitelist](https://github.com/google/closure-library/blob/master/closure/goog/html/sanitizer/tagwhitelist.js) and a [blacklist](https://github.com/google/closure-library/blob/master/closure/goog/html/sanitizer/tagblacklist.js) of tags. I spent some time trying to circumvent the sanitizer of Closure to no avail. Closure is, after all, a very popular library for HTML sanitization, hence it was unlikely I'd be able some security errors in it in a short time.

At this point, I needed to look at Colaboratory from a different angle. I went back to [the documentation](https://colab.research.google.com/notebooks/markdown_guide.ipynb) and noticed one thing that had eluded me before: Colaboratory also supports the LaTeX syntax. That might be the Holy Grail!

I went back to Colaboratory and entered the following code:

```
\frac 1 2
```

Which yielded the following in the DOM tree:

```html
<span
  class="MathJax"
  id="MathJax-Element-5-Frame"
  tabindex="0"
  data-mathml='<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>'
  role="presentation"
  style="position: relative;"
>
  <nobr aria-hidden="true"> \[...\] </nobr>
  <span class="MJX\_Assistive\_MathML" role="presentation">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <mfrac>
        <mn>1</mn>
        <mn>2</mn>
      </mfrac>
    </math>
  </span>
</span>
```

There was also a large chunk of code inside the `<nobr>` tag but removed it for brevity.

The rest of the code, however, looked very interesting. I mentioned earlier that Colaboratory used the Closure library to clean HTML from dangerous elements. Closure had a whitelist of tags. And the whitelist didn't contain any of tags: `<math>`, `<mfrac>` or `<mn>`. Yet they appeared in the HTML as a result of rendering LaTeX. In addition, in the first line, in the `data-mathml` attribute  you can see exactly the same HTML that will be rendered a few lines further.

This was the exact moment during testing when I felt that I was on the right track and on a good way to XSS. Why? Because, such behavior of the application proves that Closure library is not used to clean HTML generated by MathJax (LaTeX library). At this point, the problem of finding XSS in Colaboratory - boiled down to finding XSS in MathJax. It seemed quite likely for me that MathJax wasn't carefully audited for security issues.

So I looked at [MathJax's documentation](http://docs.mathjax.org/en/latest/tex.html) to find out what LaTeX macros are supported. First of all, I noticed the following macro: `\href {url}{math}`. According to the documentation, it allows you to create links inside LaTeX. So is it the right time to use the trick of: `\href{javascript:alert(1)}{1}`? ;) Unfortunately not. It turned out that [MathJax has a safe-mode](http://docs.mathjax.org/en/latest/safe-mode.html), which protects against this very attack. Shame!

Going further with the docs, I found  `\unicode` macro, which allows any unicode characters to be placed in the LaTeX code by their code point. Both numbers in decimal and hexadecimal form can be used. So I tried to use it in Colaboratory, typing the capital letter "A"  in two ways:

```
\unicode{x41}\unicode{65}
```

Then the following appeared in the DOM tree:

```html
<span
  class="MathJax"
  id="MathJax-Element-6-Frame"
  tabindex="0"
  data-mathml='<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>&#x41;</mtext><mtext>&#65;</mtext></math>'
  role="presentation"
  style="position: relative;"
>
  <span class="MJX\_Assistive\_MathML" role="presentation">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <mtext>A</mtext>
      <mtext>A</mtext>
    </math>
  </span>
</span>
```

Have a look at the highlighted fragment. The data-mathml attribute contains, within `<mtext>` tags, HTML entities in exactly the same form as I typed them, i.e. `&#x41;` and `&#65;`. So maybe MathJax does not verify the argument to the `\unicode` macro at all, and just puts it directly into HTML? Let's see:

```
\unicode{<img src=1 onerror=alert(1)>}
```

And then in the DOM tree:

```html
<span class="MathJax" id="MathJax-Element-7-Frame" tabindex="0" data-mathml="<math xmlns=&quot;http://www.w3.org/1998/Math/MathML&quot;><mtext>&amp;#<img src=1 onerror=alert(1)>;</mtext></math>" role="presentation" style="position: relative;">
<span class="MJX\_Assistive\_MathML" role="presentation">
<math xmlns="http://www.w3.org/1998/Math/MathML">
<mtext>&amp;#
<img src="1" onerror="alert(1)">
;</mtext>
</math>
</span>
</span>
```

This is just great! The `<img>` tag appeared in the DOM tree without any sanitization! The problem is... that no alert was shown.

For a while I was confused what was that but things got cleared up when I had a look at the console.

[![](https://3.bp.blogspot.com/-ErQgX2cE46c/WyvhMH-xRPI/AAAAAAAAAOI/PjPzxi1Vcikuqy-aE3_g6Z8hkF-eJ9DUACK4BGAYYCw/s640/rys3.png)](http://3.bp.blogspot.com/-ErQgX2cE46c/WyvhMH-xRPI/AAAAAAAAAOI/PjPzxi1Vcikuqy-aE3_g6Z8hkF-eJ9DUACK4BGAYYCw/s1600/rys3.png)

So Colaboratory is protected by Content-Security-Policy. And in this case, it did its work. Anyway, I decided to submit the bug to Google at this point because CSP doesn't change the fact that root cause of the XSS (MathJax bug) is still there.

I sent a report (shown below) and decided to go to bed and try to fight with CSP the next day in the morning.

[![](https://3.bp.blogspot.com/-NjaTkzlNLdE/WyvhfnFnRGI/AAAAAAAAAOk/9mgBT9Et85UDAbAHdWlQNagJFlb78E8zACK4BGAYYCw/s400/rys4.png)](http://3.bp.blogspot.com/-NjaTkzlNLdE/WyvhfnFnRGI/AAAAAAAAAOk/9mgBT9Et85UDAbAHdWlQNagJFlb78E8zACK4BGAYYCw/s1600/rys4.png)

### Content Security-Policy bypass

In fact, I couldn't have a good sleep. I really don't like it when I report a bug that doesn't work in a real world case. I had to get up and try harder ;)

The CSP, as used in Colaboratory, contained two most important directives: `'nonce-...'` and `'strict-dynamic'`. Basically, `'nonce-...'` makes a script tag execute only when it contains a nonce attribute with the same value as the `'nonce-...'` directive. `'strict-dynamic'`, on the other hand, introduces a transitive trust for script inclusion. When you have a trusted script (for example because of a correct nonce) and it adds a new `<script>` tag to the DOM tree, the new tag is trusted as it was added by an already trusted script.

Last year, Sebastian Lekies, Krzysztof Kotowicz and Eduardo Vela Nava had an awesome presentation at various security conferences, called [Breaking XSS mitigations via Script Gadgets](https://www.blackhat.com/docs/us-17/thursday/us-17-Lekies-Dont-Trust-The-DOM-Bypassing-XSS-Mitigations-Via-Script-Gadgets.pdf). They've shown that you can use a lot of popular JS framework to bypass various mitigations against XSS-es, including CSP. In the presentation you can also find a slide which shows what kind of security measure you can bypass with a given framework. It turns out that Polymer (framework used by Colaboratory) can bypass any kind of CSP.

[![](https://4.bp.blogspot.com/-sdNEcSYjer8/WyvhaH0qBKI/AAAAAAAAAOY/1J0FORhTk78MbRzQhrkfd_vYtgdS1iV5gCK4BGAYYCw/s640/rys5.png)](http://4.bp.blogspot.com/-sdNEcSYjer8/WyvhaH0qBKI/AAAAAAAAAOY/1J0FORhTk78MbRzQhrkfd_vYtgdS1iV5gCK4BGAYYCw/s1600/rys5.png)

So what is Polymer? In a nutshell, it is a JS library in which you can define your own HTML elements and later use them directly in the code. For instance, in case of Colaboratory, you can press the "SHARE" button and then a new element `<colab-dialog-impl>` will appear in the DOM tree. My idea was to try and replace the default template of that element. So I wrote the following code:

```
$ \unicode{</math><dom-module id=colab-dialog-impl>
<template>
SOME RANDOM TEXT
</template>
</dom-module>} $
```

The result you can see in the video below.

[![](https://3.bp.blogspot.com/-waKVsBeTk0U/WzSJW0rpBjI/AAAAAAAAAO0/tIqgm1IJZsUWYQJtS-LHc9TwTq5B3pCgwCK4BGAYYCw/s400/ezgif-4-410fcc46c5.gif)](http://3.bp.blogspot.com/-waKVsBeTk0U/WzSJW0rpBjI/AAAAAAAAAO0/tIqgm1IJZsUWYQJtS-LHc9TwTq5B3pCgwCK4BGAYYCw/s1600/ezgif-4-410fcc46c5.gif)

It is great! After clicking "SHARE", you can clearly see that my "SOME RANDOM TEXT" appeared instead of the original window.

Let's now move on with a script injection:

```
$ \unicode{</math><dom-module id=colab-dialog-impl>
<template>
  <script>alert(1)</script>
</template>
</dom-module>
<colab-dialog-impl>} $
```

Let's stop for a second and explain why that should work. The `<script>` tag is actually within a `<template>` element. Then, when "SHARE" button is pressed, the script would get inserted into the DOM tree by Polymer. Polymer is trusted, hence, per 'strict-dynamic', the new script tag is also trusted.

The final alert is shown below:

[![](https://1.bp.blogspot.com/-smw6o7XYltI/WzSJpIv2EyI/AAAAAAAAAPA/Rh4HENZUFe0awZ0zTG4dtgEQgXMCrumjwCK4BGAYYCw/s400/ezgif-4-3f21cb39be.gif)](http://1.bp.blogspot.com/-smw6o7XYltI/WzSJpIv2EyI/AAAAAAAAAPA/Rh4HENZUFe0awZ0zTG4dtgEQgXMCrumjwCK4BGAYYCw/s1600/ezgif-4-3f21cb39be.gif)

After a long journey, I finally have the XSS!

### Summary

To summarize, I showed how I managed to identify an XSS in Colaboratory. This was made possible by finding a security bug in the MathJax library. In the next step, I had to use a trick known as _script gadgets_ to bypass Content-Security-Policy.

The bug in MathJax has been fixed, although the [commit](https://github.com/mathjax/MathJax/commit/a55da396c18cafb767a26aa9ad96f6f4199852f1) does not contain any explicit information that it has anything to do with a security issue.
