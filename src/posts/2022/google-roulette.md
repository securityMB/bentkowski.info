---
title: 'Chromium: Same Origin Policy bypass within a single site a.k.a. "Google Roulette"'
date: "2022-11-20"
---

Suppose you're visiting a legit website, like `developers.google.com`, which tells you to open a JavaScript console in your browser, and then just invoke a function called `magic()`. Would you do it?

Of course, the function may access everything within the scope of `https://developers.google.com` but it cannot steal data from other origins. Or can it?

In this post, I'm describing a security issue in Chromium, which proves that entering code in a JavaScript console can have a little broader consequences than it may initially seem.

### A little background

The issue in question is [Chromium bug #1069486](https://crbug.com/1069486) that I reported back in April 2020.

As of 16th November 2022, the bug is not fixed, which essentially makes it a 0-day. However, I got explicit permission from the Chromium team to do a full disclosure. Also, because the attack scenario requires the victim to enter code in the DevTools console, I believe it's not practically exploitable.

I still think that there might be some ways to escalate it that I failed to discover, and maybe you, my dear readers, will have some better ideas.

### JavaScript console and utilities

But let's start with some basics. When you enter code in the JavaScript console, it should be equivalent to executing the same code directly by the website. This means, among others, that even in the console you cannot bypass Same-Origin-Policy or other fundamental security principles imposed by browsers.

The truth is, however, that the console _is_ a little bit more powerful than the "normal" JavaScript. The difference lies in [console utilities](https://developer.chrome.com/docs/devtools/console/utilities/). These are a bunch of functions that are exposed _only_ to the console and they are not available from "normal" Javascript. Let's see what it means.

As an example, take a function called `$$`. This is a shorthand for `document.querySelectorAll`, available only in the console.

If you try to call it from the console, the function executes just fine:

![Screenshot showing that you can execute $$ from the console](/roulette/screen1.png "$$ from the console works...")

On the other hand, if you try to call it directly from your HTML, such as from the following code:

```html
<script>
  $$("body");
</script>
```

Then you'll get a `ReferenceError`:

![Screenshot showing that you cannot execute $$ from the HTML](/roulette/screen2.png "... but it doesn't from the HTML")

I consider this an expected behavior. Now we may conclude that Chromium must differentiate whether a JS code was executed from the console or not and decide whether certain global functions or objects should be exposed to the code.

At this point, I wondered how exactly Chromium tracks the source of the function call. So my idea was to create a `<script>` tag containing a reference to `$$`Let's see what happens when we create a function that includes a reference to `$$` in the website, but then we'll call the function from the console.

So I created an HTML file with the following code:

```html
<script>
  function magic() {
    console.log($$);
  }
</script>
```

After that, I tried to call `magic()` from the console. I could've imagined Chromium reacting in one of the following two ways:

1. Return a reference to the console utility `$$` as the code is ultimately invoked from the console.
2. OR throw a `ReferenceError` since the reference to `$$` is in "normal" JavaScript.

![Screenshot showing that reference to $$ exists](/roulette/screen3.png)

So at this point, I've concluded that I want to consider the attack scenario as mentioned at the very beginning of the post: assume that you're visiting a malicious website that asks you to execute something simple in the console. Is it possible to abuse console utilities to do something evil?

The answer is: oh yes, it is. And to do so, I'll use one console utility: `debug()`. But before, we need to talk about one important implementation detail of Chromium: site isolation.

### Site Isolation and process re-use

Site Isolation is a pretty big security feature of Chromium, which became even more important in the post-Spectre world. The Chromium project provides [a really good summary of the security benefits and trade-offs on its official website](https://www.chromium.org/Home/chromium-security/site-isolation/).

The only thing that matters for us in the context of this blog post is the fact that Chromium runs different Sites in different processes. But what is also important is that Chromium might run two different origins of the same Site in the same process. In other words: it may re-use the process for two different origins.

TODO: definition of site.

To prove that it happens, consider the following scenario:

1. Open the Task Manager in Chrome.
2. Open `https://support.google.com` and take note of the Process ID. In the example below, the ID is `50476`.

![Screenshot showing Task Manager of Chromium](/roulette/screen4.png)

3. Go to the address bar and change the address to `https://workpace.google.com`.
4. Notice that the Process ID is still exactly the same (for me, still `50476`).

![Screenshot showing Task Manager of Chromium](/roulette/screen5.png)

So the Process ID hasn't changed, which implies that it is still the same process, even though it is serving a different origin. And Chromium re-uses the same process, maybe we can pollute some data structures and execute our JavaScript code in a different origin?

### Meet `debug()`

`debug()` is a really useful console utility in Chromium; I use it in bug hunting or penetration testing all the time (but maybe I'll write a separate blog post about this use case).

The basic idea is that with `debug()`, you can set a breakpoint whenever a function (given as the first argument to the function) is called. The second argument to `debug()` is optional, and this is a string of JavaScript code with a condition; the breakpoint will be hit only if it returns a truthy value.

The following snippet explains the usage of `debug()`:

```javascript
function foobar(arg) {
  /* ... */
}
// Example #1
debug(foobar); // will hit a breakpoint any time `foobar()` is called
// Example #2
debug(foobar, 'arguments[0] === "test"'); // will hit a breakpoint only if the first argument is equal to "test"
```

What is especially cool with `debug()` is that you can even set breakpoints on built-in functions! Want to break on `document.appendChild`? `debug()` comes with a rescue:

```javascript
debug(document.appendChild); // will break any time document.appendChild is called
```

You can abuse the second argument of `debug()` to perform only the logging of function calls. Because `console.log()` returns `undefined`, it will make the breakpoint not being hit, while still logging the data. For instance, go to `www.google.com`, and enter the following code in the console:

```javascript
debug(document.appendChild, `console.log("appendChild called")`);
```

Afterward, do some Google search and you'll notice **tons** of `appendChild called` messages in the console.

![Screenshot showing Task Manager of Chromium](/roulette/screen6.png)

And now comes the tricky part; also known as the buggy part. Just try to refresh the page. And surprise: `appendChild called` messages will appear again! You can watch that in the video below.

<video controls src="/roulette/video1.mp4"></video>

Wait, what? This is quite unexpected! I thought that refreshing the page destroys all breakpoints, and the code should no longer execute. But it does.

But that's not the end of the story. Remember when we verified that Chromium can re-use a process if you stay on the same Site, even if you are in a different origin? It turns out that the breakpoints are also re-used!

In the video below I'm showing that I enter some code on `www.google.com`, and then when I move to `developers.google.com`, it still executes.

<video controls src="/roulette/video2.mp4"></video>

This has obvious security consequences: you can enter a code on one origin, and the code then executes on another origin. So this is a Same Origin Policy bypass although it is limited only to a single site.

### "Google Roulette"

Now it's time to move on to the title of this post, which is "Google Roulette". This is my idea of showcasing the security issue; suppose the attacker has an XSS on `developers.google.com`. And the page asks you to go to the console and enter a single command: `magic`. And then you are XSS-ed on various Google domains! Watch it below.

<video controls src="/roulette/video3.mp4"></video>

And here's the code:

```javascript
function xss() {
  if (window.__alerted__) return false;
  // I could use more origins but you get the idea
  const ORIGINS = [
    "https://developers.google.com",
    "https://www.google.com",
    "https://support.google.com",
    "https://careers.google.com",
    "https://images.google.com",
    "https://workspace.google.com",
    "https://firebase.google.com",
  ];
  alert(`XSS on ${origin}!`);
  // Just redirect to the next origin from the list
  const nextOrigin = ORIGINS[ORIGINS.indexOf(origin) + 1];
  window.__alerted__ = 1;
  if (!nextOrigin) return false;
  location = nextOrigin;
  return false;
}

window.__defineGetter__("magic", () => {
  // Call xss() after document.appendChild is called
  debug(document.appendChild, `(${xss})()`);
  location.reload();
});
```

### Conclusion

In this post, I described an unfixed bug in Google Chrome that allows bypassing the Same Origin Policy within a single Site. While the effects can be serious, the fact that you need to enter some code in DevTools makes it a vulnerability that would be difficult to exploit in the wild.

There are some catches though. The main catch that I was trying to find (but failed) is to trick Chromium into thinking that some code was executed from the console even though it wasn't. I guess that's some space for research here.
