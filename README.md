# Run website on localhost:

```ps1
$ npm start
```

# Format all file:

```ps1
$ npm run format
```

# Database setup plan

Users:

```json
{
    "_id": "090df0sd0f28391023",
    "name": "Bob",
    "username": "Bob",
    "cookieID": "idasdno8hdoAksdj",
    "password": "password123",
    "rooms": {
        "9hfm09asfsd": "admin",
        "sd9uf87fsduf": "co-admin",
        "osjd78godifjd": "member"
    },
    "pins": {
        "public": ["ksdf8g7dfo", "54n89tgjfd", "mk1nj322j2"],
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
            "author": "lkdgu7dlfukjasdj",
            "content": "yo",
            "createdAt": "Thu Feb 09 2023 23:01:47 GMT+0800 (Malaysia Time)"
        },
        {
            "author": "090df0sd0f28391023",
            "content": "wutsup",
            "createdAt": "Thu Feb 09 2023 23:00:54 GMT+0800 (Malaysia Time)"
        }
    ],
    "members": []
}
```

```json
{
    "_id": "9hfm09asfsd",
    "name": "Balistik ai",
    "visibility": "private",
    "messages": [
        {
            "author": "lkdgu7dlfukjasdj",
            "content": "hi",
            "createdAt": "Thu Feb 09 2023 23:08:01 GMT+0800 (Malaysia Time)"
        },
        {
            "author": "090df0sd0f28391023",
            "content": "hello",
            "createdAt": "Thu Feb 09 2023 23:06:03 GMT+0800 (Malaysia Time)"
        }
    ],
    "members": ["lkdgu7dlfukjasdj", "090df0sd0f28391023"]
}
```
