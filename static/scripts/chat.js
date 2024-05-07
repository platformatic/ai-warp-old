// For temporarily disabling further prompts if we're already responding to one
let isAlreadyResponding = false
const promptInput = document.getElementById('prompt-input')
const promptButton = document.getElementById('prompt-button')
const messagesElement = document.getElementById('messages')

/**
 * List of completed messages to easily keep track of them instead of making
 *  calls to the DOM
 * 
 * { type: 'prompt' | 'response' | 'error', message?: string }
 */
const messages = []

promptButton.onclick = () => {
  const prompt = promptInput.value
  if (prompt === '' || isAlreadyResponding) {
    return
  }

  createMessageElement('prompt', prompt)
  promptAiWarp(prompt).catch(err => {
    throw err
  })

  promptInput.value = ''
}

/**
 * @param {KeyboardEvent} event
 */
promptInput.onkeydown = (event) => {
  if (event.key === 'Enter') {
    promptButton.onclick()
  }
}

const searchParams = new URL(document.location.toString()).searchParams
if (searchParams.has('prompt')) {
  const prompt = searchParams.get('prompt')
  createMessageElement('prompt', prompt)
  promptAiWarp(prompt).catch(err => {
    throw err
  })
}

/**
 * @param {string} prompt
 */
async function promptAiWarp (prompt) {
  isAlreadyResponding = true

  try {
    const res = await fetch('/api/v1/stream', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    })
    if (res.status !== 200) {
      const { message, code } = await res.json()
      throw new Error(`AI Warp error: ${message} (${code})`)
    }

    createMessageElement('response', res.body)
  } catch (err) {
    createMessageElement('error')
    console.error(err)
    isAlreadyResponding = false
  }
}

/**
 * @param {'prompt' | 'response' | 'error'} type
 * @param {string | ReadableStream | undefined} message String if it's a prompt, ReadableStream if it's a response
 */
function createMessageElement (type, message) {
  const messageElement = document.createElement('div')
  messageElement.classList.add('message')
  messagesElement.appendChild(messageElement)

  const avatarElement = document.createElement('div')
  avatarElement.classList.add('message-avatar')
  messageElement.appendChild(avatarElement)

  const avatarImg = document.createElement('img')
  avatarElement.appendChild(avatarImg)

  const contentsElement = document.createElement('div')
  contentsElement.classList.add('message-contents')
  messageElement.appendChild(contentsElement)

  const authorElement = document.createElement('p')
  authorElement.classList.add('message-author')
  contentsElement.appendChild(authorElement)

  if (type === 'prompt') {
    avatarImg.setAttribute('src', '/images/avatars/you.svg')
    authorElement.innerHTML = 'You'
  } else {
    avatarImg.setAttribute('src', '/images/avatars/platformatic.svg')
    authorElement.innerHTML = 'Platformatic Ai-Warp'
  }

  if (type === 'error' && message === undefined) {
    // Display error message
    const textElement = document.createElement('p')
    textElement.classList.add('message-error')
    textElement.innerHTML = '<img src="/images/icons/error.svg" alt="Error" /> Something went wrong. If this issue persists please contact us at support@platformatic.dev'
    contentsElement.appendChild(textElement)
    textElement.scrollIntoView()

    messages.push({ type: 'error' })
  } else if (typeof message === 'string') {
    // Echo prompt back to user
    const textElement = document.createElement('p')
    textElement.innerHTML = message
    contentsElement.appendChild(textElement)
    contentsElement.appendChild(createMessageOptionsElement('prompt', message))
    textElement.scrollIntoView()

    messages.push({ type: 'prompt', message })
  } else {
    // Parse response from api
    parseResponse(contentsElement, message)
      .then(() => {
        isAlreadyResponding = false
      })
      .catch(err => {
        createMessageElement('error')
        console.error(err)
      })
  }
}

/**
 * @param {string} response
 * @returns {HTMLButtonElement}
 */
function createCopyResponseButton (response) {
  const element = document.createElement('button')
  element.onclick = () => {
    navigator.clipboard.writeText(response)
  }

  const icon = document.createElement('img')
  icon.setAttribute('src', '/images/icons/copy.svg')
  icon.setAttribute('alt', 'Copy')
  element.appendChild(icon)

  return element
}

/**
 * @param {string} response
 * @returns {HTMLButtonElement}
 */
function createRegenerateResponseButton (response) {
  const element = document.createElement('button')
  element.onclick = () => {
    // TODO
  }

  const icon = document.createElement('img')
  icon.setAttribute('src', '/images/icons/regenerate.svg')
  icon.setAttribute('alt', 'Regenerate')
  element.appendChild(icon)

  return element
}

/**
 * @param {'prompt' | 'response'} type
 * @param {string} message
 * @param {number} messageIndex Index of the message in {@link messages}
 * @returns {HTMLDivElement}
 */
function createMessageOptionsElement (type, message, messageIndex) {
  const messageOptions = document.createElement('div')
  messageOptions.classList.add('message-options')

  if (type === 'prompt') {
    // TODO
  } else if (type === 'response') {
    messageOptions.appendChild(createRegenerateResponseButton(message))
    messageOptions.appendChild(createCopyResponseButton(message))
  }

  return messageOptions
}

/**
 * @param {HTMLDivElement} parentElement Parent
 * @param {ReadableStream} stream To read from
 */
async function parseResponse (parentElement, stream) {
  let isFirstPass = true

  let currentElement = document.createElement('p')
  currentElement.innerHTML = '<i>Platformatic Ai-Warp is typing...</i>'
  parentElement.appendChild(currentElement)

  let fullResponse = ''

  const parser = new SSEParser(stream)
  while (true) {
    if (isFirstPass) {
      currentElement.innerHTML = ''
      isFirstPass = false
    }

    const tokens = await parser.pull()
    if (tokens === undefined) {
      break
    }

    const tokenString = tokens.join('')
    fullResponse += tokenString

    const lines = tokenString.split('\n')
    for (let i = 0; i < lines.length; i++) {
      currentElement.innerHTML += lines[i]

      if (i + 1 < lines.length) {
        currentElement = document.createElement('p')
        parentElement.appendChild(currentElement)
        currentElement.scrollIntoView()
      }
    }
  }

  parentElement.appendChild(createMessageOptionsElement('response', fullResponse))

  messages.push({ type: 'response', message: fullResponse })
}

/**
 * Parser for server sent events returned by the streaming endpoint
 */
class SSEParser {
  /**
   * @param {ReadableStream} stream
   */
  constructor (stream) {
    this.reader = stream.getReader()
    this.decoder = new TextDecoder()
  }

  /**
   * @returns {string[] | undefined} Undefined at the end of the stream
   */
  async pull () {
    const { done, value } = await this.reader.read()
    if (done) {
      return undefined
    }

    const decodedValue = this.decoder.decode(value)
    const lines = decodedValue.split('\n')

    const tokens = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      if (line.length === 0) {
        i++
        continue
      }

      if (!line.startsWith('event: ')) {
        throw new Error(`Unexpected event type line: ${line}`)
      }

      const dataLine = lines[i + 1]
      if (!dataLine.startsWith('data: ')) {
        throw new Error(`Unexpected data line: ${dataLine}`)
      }

      const eventType = line.substring('event: '.length)
      const data = dataLine.substring('data: '.length)
      const json = JSON.parse(data)
      if (eventType === 'content') {
        const { response } = json
        tokens.push(response)
      } else if (eventType === 'error') {
        const { message, code } = data
        throw new Error(`AI Warp Error: ${message} (${code})`)
      }

      i += 2
    }

    return tokens
  }
}
