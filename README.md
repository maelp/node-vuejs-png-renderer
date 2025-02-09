Example of a small server which allows to render a VueJS widget as a PNG, which could make it easier to do nice widgets to send images for Discord or WhatsApp

```sh
pnpm dev # run the server
# then:
open "http://localhost:3000/render?component=MyView&type=www&viewport-padding=10"
# or:
./curl-example.sh
```
