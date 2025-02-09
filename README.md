# node-vuejs-png-renderer

Example of a small server which allows to render a VueJS widget as a PNG, which could make it easier to do nice widgets to send images for Discord or WhatsApp

## Install

```sh
pnpm install
```

## Run

Run the server using
```sh
pnpm dev
```

Then we can render a component as png using

```sh
curl -X POST 'http://localhost:3000/render' \
  -H "Content-Type: application/json" \
  -d '{
    "component": "MyView",
    "type": "png",
    "props": {
      "username": "John",
      "itemCount": 5
    },
    "viewport": {
      "width": 600,
      "padding": 10,
      "timeout": 0,
      "backgroundColor": "transparent"
    }
  }' \
  --output screenshot.png
```

Alternatively, to debug it might be practical to render it as a webpage or as a PNG in a browser (using a GET request)
```sh
# then we can open as page (eg type=www) in a browser to debug
open "http://localhost:3000/render?component=MyView&type=www&viewport-padding=10&viewport-background=transparent"
# or change to `type=png` to check the image
open "http://localhost:3000/render?component=MyView&type=png&viewport-padding=10&viewport-background=transparent"
```

## Example widget
There is an example widget in `views/MyView.vue`

```
<template>
  <div>
    <div class="w-full inline-block">
      <!-- This wrapper ensures tight bounds -->
      <Card :title="`Welcome ${username}`">
        <img src="/images/vite.svg" alt="Vue logo (from public)" class="logo" />

        <p class="mb-4">You have {{ itemCount }} items in your cart</p>
        <Button>Click me!</Button>
      </Card>
    </div>
  </div>
</template>

<script setup>
import Card from "../components/Card.vue";
import Button from "../components/Button.vue";

defineProps({
  username: {
    type: String,
    default: "Guest",
  },
  itemCount: {
    type: Number,
    default: 0,
  },
});
</script>
```

and this is the sample render (with some padding)
![screenshot](https://github.com/user-attachments/assets/8081184c-cf46-4f0c-a39e-a9317cd725cb)
