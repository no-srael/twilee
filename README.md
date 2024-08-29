# Twilee
> :warning: **FIREFOX USERS**: You can download the extension right here on the store: https://addons.mozilla.org/en-GB/firefox/addon/twilee/; unfortunately chrome/brave users won't have that luxury.


'Twilee' is short for *'Twitter Leetspeak'*. This extension adds a 👺-button next to the Twitter Post button. Pressing the button will replace whatever text is in the input box with *leetspeak* representation based on the defined options.

## WHY WOULD YOU USE THIS?

1. **Vanity**
   * It looks cool and spices up your timeline.
2. **Character space**
   * Applying the right word replacements (e.g. 🤍🔵❤️🐻 for Russia) will save you a couple of characters per tweet, giving you more space to express what you want to say.

There are surely other use-cases you might come up with - even though I can't think of any other 🙂.

## OPTIONS

Can be defined in the extension-settings in browser or by downloading the settings JSON file from the options menu, editing in a text editor and re-uploading again.

## MATCHING LOGIC

From V1.1 Twilee supports regular expression matching.

* "russ(ia|ian|ias)" will match "russia", "russian" and "russias"
* "us(a)?" will match "us" and "usa"
* "ta[b|p]" will match "tab" and "tap"

You can test your regular expressions here: [https://regex101.com/](https://regex101.com/)

Dangerous expressions such as ".*" and ".+" are blocked and will be replaced with less greedy alternatives.

## REPLACEMENT LOGIC

* If a word is in the "wordList" of the JSON, it will be replaced.
* If there also exist an expression for the word in the "words", it will be replaced with it. Else every letter of the word will be replaced with a random selection from the corresponding letter list of "letters".

"words" follow a specific logic. Every word is associated with a list of lists. One list will be selected from the parent list. For example:

* **Parent (2 elements):**
   * `["russia": [[...], "🇷🇺"]]`
      * First element: Sub-list selection (see below)
      * Second element: 🇷🇺 (flag emoji)
* **Sub-list selection (4 elements):**
   * `[["🤍", "⚪", "◻️"], ["🔵", "🔷", "💙"], ["❤️","🟥","🔴"], ["🐻"]]`
      * First element: `["🤍", "⚪", "◻️"]` (white)
      * Second element: `["🔵", "🔷", "💙"]` (blue)
      * Third element: `["❤️","🟥","🔴"]` (red)
      * Fourth element: `["🐻"]` (bear)

One element from each list of the sub-list will be selected. The final string could therefore look like: 🤍🔵❤️🐻. Note that 🐻 will always be present as its list only has one element.

## V1.3

From version 1.2 a second button is introduced next to the "👺"-replacement button.

This button acts as a toggle and has two states: 1️⃣ 🔀

* (Default) State: 1️⃣ is single word replacement mode based on your wordlist.
* State: 🔀 is full-replacement mode replacing every character in your post ignoring your wordlist.

## KNOWN BUGS

* I recommend not to use line-breaks. Multi-Line posts cause all kinds of issues. If there is a word to be replaced on the first line of a multi line post, it will be replaced, but upon post submission it will revert to its original form. I don't know why that happens, happy for suggestions.
* This happens only on posts containing line-breaks. If you write a post that is just long and lines wrap, that's ok.
