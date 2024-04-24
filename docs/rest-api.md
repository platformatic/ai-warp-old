# REST API Endpoints

Documentation on AI Warp's REST API.

For information on authentication, see [here](./auth.md).

For information on rate limiting, see [here](./rate-limiting.md)

## Endpoints

### POST `/api/v1/prompt`

Prompt the AI Provider and receive the full response.

<details>
    <summary>Body</summary>

```json
{ "prompt": "What's 1+1?" }
```
</details>

<details>
    <summary>Response</summary>

```json
{ "response": "..." }
```
</details>

### POST `/api/v1/stream`

Prompt the AI Provider and receive a streamed response. This endpoint supports [Server Side Events](https://html.spec.whatwg.org/multipage/server-sent-events.html).

Event types:

 * `content` - Response chunk
 * `error` - An error has occured and the stream is closed.

<details>
    <summary>Body</summary>

```json
{ "prompt": "What's 1+1?" }
```
</details>

<details>
    <summary>Success response</summary>

```
event: content
data: {"response": "..."}

event: content
data: {"response": "..."}
```
</details>

<details>
    <summary>Error response</summary>

```
event: error
data: {"code":"...","message":"..."}
```
</details>

When there is no more chunks to return or an error occurs, the stream is closed.
