![Panda sitting on a mat at the porch](/public/assets/home2.jpg "Panda sitting on a mat at the porch")

# Run website on localhost:

```ps1
npm start
```

# Format all file:

```ps1
npm run format
```

# Database setup plan

Users:

```json
{
    "_id": "090df0sd0f28391023",
    "displayName": "Bob",
    "username": "Bob",
    "avatar": "/assets/default_red.png",
    "password": "password123",
    "birthday": {
        "$date": "2007-10-05T16:00:00.000Z"
    },
    "cookieId": "idasdno8hdoAksdj",
    "rooms": {
        "9hfm09asfsd": "admin",
        "sd9uf87fsduf": "co-admin",
        "osjd78godifjd": "member"
    },
    "pins": {
        "public": [
            {
                "_id": "ksdf8g7dfo",
                "name": "Detective Conan"
            },
            {
                "_id": "54n89tgjfd",
                "name": "OneTruthPrevails"
            },
            {
                "_id": "mk1nj322j2",
                "name": "css bad"
            }
        ],
        "private": []
    }
}
```

Rooms:

```json
{
    "_id": "ksdf8g7dfo",
    "name": "Detective Conan",
    "visibility": "public",
    "messages": [
        {
            "id": "ksdf8g7dfo1",
            "author": "Ran",
            "content": "yo",
            "createdAt": 1676539238720
        },
        {
            "id": "ksdf8g7dfo2",
            "author": "Shinichi",
            "content": "wutsup",
            "createdAt": 1676539238720
        }
    ],
    "members": [],
    "muted": ["talkativeguy123", "kogoro5563"],
    "msgId": 2
}
```

```json
{
    "_id": "9hfm09asfsd",
    "name": "Balistik ai",
    "visibility": "private",
    "messages": [
        {
            "id": "9hfm09asfsd1",
            "author": "Alice",
            "content": "hi",
            "createdAt": 1676539238720
        },
        {
            "id": "9hfm09asfsd2",
            "author": "Bob",
            "content": "hello",
            "createdAt": 1676542330844
        }
    ],
    "members": [
        { "username": "Alice", "role": "admin" },
        { "username": "Bob", "role": "member" }
    ],
    "muted": [],
    "msgId": 2
}
```
