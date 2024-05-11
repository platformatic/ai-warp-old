let promptLock = false
const messages = []
const messagesContainer = document.getElementById('messages')
const promptInput = document.getElementById('prompt-input')
const promptButton = document.getElementById('prompt-button')

promptButton.onclick = () => {
  handlePrompt(promptInput.value).catch(err => {
    throw err
  })
}

/**
 * @param {KeyboardEvent} event
*/
promptInput.onkeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    handlePrompt(promptInput.value).catch(err => {
      throw err
    })
  }
}

const searchParams = new URL(document.location.toString()).searchParams
if (searchParams.has('prompt')) {
  handlePrompt(searchParams.get('prompt')).catch(err => {
    throw err
  })
}

/**
 * @param {string} prompt
 */
async function handlePrompt (prompt) {
  if (prompt === '' || promptLock) {
    return
  }
  promptInput.value = ''

  const message = {
    prompt,
    response: [],
    responseIndex: 0
  }
  messages.push(message)
  drawMessage(message, true, false)

  await promptAiWarp(message)
  drawMessage(message, false, true)
}

/**
 * @param {{
 *  prompt: string,
 *  response: ReadableStream[],
 *  responseIndex: number,
 *  errored: boolean
 * }} message
 */
async function promptAiWarp (message) {
  promptLock = true

  let chatHistoryStartIndex
  if (messages.length >= 11) {
    chatHistoryStartIndex = messages.length - 12
  } else {
    chatHistoryStartIndex = 0
  }

  // Only send the previous 10 messages to abide by token limits. We also
  //  don't want to sent the latest message, since that's the one we're getting
  //  the response to
  const chatHistory = []
  for (let i = chatHistoryStartIndex; i < messages.length - 1; i++) {
    const previousMessage = messages[i]
    chatHistory.push({
      prompt: previousMessage.prompt,
      response: previousMessage.response[previousMessage.responseIndex]
    })
  }

  try {
    const res = await fetch('/api/v1/stream', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        prompt: message.prompt,
        chatHistory
      })
    })
    if (res.status !== 200) {
      const { message, code } = await res.json()
      throw new Error(`AI Warp error: ${message} (${code})`)
    }

    message.response[message.responseIndex] = res.body
  } catch (err) {
    promptLock = false
    message.errored = true
    console.error(err)
  }
}

/**
 * @param {{
 *  prompt: string,
 *  response: (string[] | ReadableStream)[],
 *  responseIndex: number,
 *  errored: boolean | undefined
 * }} message
 * @param {boolean} drawPrompt
 * @param {boolean} drawResponse
 */
function drawMessage (message, drawPrompt, drawResponse) {
  if (drawPrompt) {
    drawPromptMessage(message)
  }
  if (drawResponse) {
    drawResponseMessage(message)
  }
}

/**
 * @param {{ prompt: string }} message
 */
function drawPromptMessage (message) {
  const element = document.createElement('div')
  element.classList.add('message')
  element.appendChild(drawMessageAvatar('prompt'))
  element.appendChild(drawMessageContents('prompt', message))

  messagesContainer.appendChild(element)
}

/**
 * @param {{
 *  prompt: string,
*   response: (string[] | ReadableStream)[],
*   responseIndex: number,
*   errored: boolean | undefined
*  }} message
 */
function drawResponseMessage (message) {
  const element = document.createElement('div')
  element.classList.add('message')
  element.appendChild(drawMessageAvatar('response'))
  element.appendChild(drawMessageContents('response', message))

  messagesContainer.appendChild(element)
}

/**
 * @param {'prompt' | 'response'} type
 * @returns {HTMLDivElement}
 */
function drawMessageAvatar (type) {
  const element = document.createElement('div')
  element.classList.add('message-avatar')

  const img = document.createElement('img')
  if (type === 'prompt') {
    img.setAttribute('src', '/images/avatars/you.svg')
    img.setAttribute('alt', 'You')
  } else {
    img.setAttribute('src', '/images/avatars/platformatic.svg')
    img.setAttribute('alt', 'Platformatic Ai-Warp')
  }
  element.appendChild(img)

  return element
}

/**
 * @param {'prompt' | 'response'} type
 * @param {{
 *  prompt: string,
 *  response: (string[] | ReadableStream)[],
 *  responseIndex: number,
 *  errored: boolean | undefined
 * }} message
 * @returns {HTMLDivElement}
 */
function drawMessageContents (type, message) {
  const element = document.createElement('div')
  element.classList.add('message-contents')

  const author = document.createElement('p')
  author.classList.add('message-author')
  author.innerHTML = type === 'prompt' ? 'You' : 'Platformatic Ai-Warp'
  element.appendChild(author)

  if (message.errored) {
    element.appendChild(drawErrorMessageContents(message))
  } else if (type === 'prompt') {
    element.appendChild(drawPromptMessageContents(type, message))
    element.appendChild(drawPromptMessageOptions(message))
  } else {
    // ReadableStream doesn't have a length property
    if (message.response[message.responseIndex].length !== undefined) {
      drawCompletedResponseMessageContents(element, message)
      element.appendChild(drawResponseMessageOptions(message))
    } else {
      drawStreamedMessageContents(element, message)
        .then(() => element.appendChild(drawResponseMessageOptions(message)))
        .catch(err => {
          throw err
        })
    }
  }

  return element
}

/**
 * @returns {HTMLParagraphElement}
 */
function drawErrorMessageContents () {
  const element = document.createElement('p')
  element.classList.add('message-error')
  element.innerHTML = '<img src="/images/icons/error.svg" alt="Error" /> Something went wrong. If this issue persists please contact us at support@platformatic.dev'

  return element
}

/**
 * @param {'prompt' | 'response'} type
 * @param {{ prompt: string }} message
 * @returns {HTMLParagraphElement}
 */
function drawPromptMessageContents (type, message) {
  const element = document.createElement('p')
  element.appendChild(document.createTextNode(message.prompt))

  return element
}

/**
 * @param {HTMLDivElement} parent
 * @param {{ prompt: string, response: string[][], responseIndex: number }} message
 */
function drawCompletedResponseMessageContents (parent, message) {
  let i = 0
  do {
    const element = document.createElement('p')
    element.appendChild(document.createTextNode(message.response[message.responseIndex][i]))
    parent.appendChild(element)
    i++
  } while (i < message.response[message.responseIndex].length)
}

/**
 * @param {HTMLDivElement} parent
 * @param {{ prompt: string, response: ReadableStream, responseIndex: number }} message
 */
async function drawStreamedMessageContents (parent, message) {
  let fullResponse = ''
  let current = document.createElement('p')
  let newLine = true
  parent.appendChild(current)

  const parser = new SSEParser(message.response[message.responseIndex])
  while (true) {
    const tokens = await parser.pull()
    if (tokens === undefined) {
      break
    }

    const tokenString = escapeHtml(tokens.join(''))
    fullResponse += tokenString

    const lines = tokenString.split('\n')

    if (newLine) {
      lines[0] = addNonBreakingSpaces(lines[0])
      newLine = false
    }

    // If there are is only one line, we can just append it to the current paragraph,
    // otherwise we need to create a new paragraph for each line
    current.innerHTML += lines[0]
    current.scrollIntoView(false)

    for (let i = 1; i < lines.length; i++) {
      current = document.createElement('p')
      parent.appendChild(current)
      current.scrollIntoView(false)
      lines[i] = addNonBreakingSpaces(lines[i])
      current.innerHTML += lines[i]
      newLine = true
    }
  }

  // Not great, but works for now
  message.response[message.responseIndex] = []
  for (const line of fullResponse.split('\n')) {
    message.response[message.responseIndex].push(line)
  }

  promptLock = false
}

/**
 * @param {string} message
 * @returns {string}
 */
function addNonBreakingSpaces (str) {
  return str.replace(/^ +/g, (spaces) => {
    return spaces.split('').map(() => '&nbsp;').join('')
  })
}

/**
 * @param {{ prompt: string, response: string, errored: boolean | undefined }} message
 * @returns {HTMLParagraphElement}
 */
function drawPromptMessageOptions (message) {
  const element = document.createElement('div')
  element.classList.add('message-options')

  const rightAlignedElements = document.createElement('div')
  rightAlignedElements.classList.add('message-options-right')
  rightAlignedElements.appendChild(drawEditPromptButton(element, message))
  element.appendChild(rightAlignedElements)

  return element
}

/**
 * @param {HTMLDivElement} parent
 * @param {{ prompt: string }} message
 * @returns {HTMLButtonElement}
 */
function drawEditPromptButton (parent, message) {
  const element = document.createElement('button')
  element.onclick = () => {
    // Set the prompt text to be editable
    parent.parentNode.children.item(1).setAttribute('contenteditable', 'true')

    parent.innerHTML = ''
    parent.appendChild(drawCancelPromptEditButton(parent, message))
    parent.appendChild(drawSubmitPromptEditButton(parent, message))
  }

  const icon = document.createElement('img')
  icon.setAttribute('src', '/images/icons/edit.svg')
  icon.setAttribute('alt', 'Edit')
  element.appendChild(icon)

  return element
}

/**
 * @param {HTMLDivElement} parent
 * @param {{ prompt: string }} message
 * @returns {HTMLButtonElement}
 */
function drawCancelPromptEditButton (parent, message) {
  const element = document.createElement('button')
  element.classList.add('cancel-prompt-edit-button')
  element.innerHTML = 'Cancel'

  element.onclick = () => {
    const promptParagraph = parent.parentNode.children.item(1)
    promptParagraph.setAttribute('contenteditable', false)
    promptParagraph.innerHTML = message.prompt

    parent.parentNode.appendChild(drawPromptMessageOptions(message))
    parent.remove()
  }

  return element
}

/**
 * @param {HTMLDivElement} parent
 * @param {{ prompt: string }} message
 * @returns {HTMLButtonElement}
 */
function drawSubmitPromptEditButton (parent, message) {
  const element = document.createElement('button')
  element.classList.add('submit-prompt-edit-button')
  element.innerHTML = 'Save and submit'

  element.onclick = () => {
    if (promptLock) {
      return
    }

    const promptParagraph = parent.parentNode.children.item(1)
    const newPrompt = promptParagraph.innerHTML
    if (newPrompt === message.prompt) {
      // No change
      return
    }

    message.prompt = newPrompt

    promptAiWarp(message)
      .catch(err => {
        throw err
      })
      .finally(() => {
        redrawMessages()
      })
  }

  return element
}

/**
 * @param {{ prompt: string, response: (string[] | ReadableStream)[], responseIndex: number }} message
 * @returns {HTMLDivElement}
 */
function drawResponseMessageOptions (message) {
  const element = document.createElement('div')
  element.classList.add('message-options')

  if (message.response.length > 1) {
    element.appendChild(drawResponseIndexSelector(message))
  }

  const rightAlignedElements = document.createElement('div')
  rightAlignedElements.classList.add('message-options-right')
  rightAlignedElements.appendChild(drawRegenerateResponseButton(message))
  rightAlignedElements.appendChild(drawCopyResponseButton(message))
  element.appendChild(rightAlignedElements)

  return element
}

/**
 * @param {{ response: (string[] | ReadableStream)[], responseIndex: number }} message
 * @returns {HTMLDivElement}
 */
function drawResponseIndexSelector (message) {
  const element = document.createElement('div')
  element.classList.add('response-index-selector')

  const leftArrow = document.createElement('button')
  const leftArrowIcon = document.createElement('img')
  leftArrowIcon.setAttribute('src', '/images/icons/arrow-left.svg')
  leftArrowIcon.setAttribute('alt', 'Previous')
  leftArrow.appendChild(leftArrowIcon)
  element.appendChild(leftArrow)

  leftArrow.onclick = () => {
    if (message.responseIndex === 0) {
      return
    }

    message.responseIndex--
    redrawMessages()
  }

  const positionText = document.createElement('p')
  positionText.innerHTML = `${message.responseIndex + 1}/${message.response.length}`
  element.appendChild(positionText)

  const rightArrow = document.createElement('button')
  const rightArrowIcon = document.createElement('img')
  rightArrowIcon.setAttribute('src', '/images/icons/arrow-right.svg')
  rightArrowIcon.setAttribute('alt', 'Next')
  rightArrow.appendChild(rightArrowIcon)
  element.appendChild(rightArrow)

  rightArrow.onclick = () => {
    if (message.responseIndex + 1 >= message.response.length) {
      return
    }

    message.responseIndex++
    redrawMessages()
  }

  return element
}

/**
 * @param {{ prompt: string, responseIndex: number }} message
 * @returns {HTMLButtonElement}
 */
function drawRegenerateResponseButton (message) {
  const element = document.createElement('button')
  element.onclick = () => {
    message.responseIndex++
    promptAiWarp(message)
      .catch(err => {
        throw err
      })
      .finally(() => {
        redrawMessages()
      })
  }

  const icon = document.createElement('img')
  icon.setAttribute('src', '/images/icons/regenerate.svg')
  icon.setAttribute('alt', 'Regenerate')
  element.appendChild(icon)

  return element
}

/**
 * @param {{ response: string[], responseIndex: number }} message
 * @returns {HTMLButtonElement}
 */
function drawCopyResponseButton (message) {
  const element = document.createElement('button')

  const icon = document.createElement('img')
  icon.setAttribute('src', '/images/icons/copy.svg')
  icon.setAttribute('alt', 'Copy')
  element.appendChild(icon)

  element.onclick = () => {
    navigator.clipboard.writeText(message.response[message.responseIndex])

    icon.setAttribute('src', '/images/icons/checkmark.svg')
    setTimeout(() => {
      icon.setAttribute('src', '/images/icons/copy.svg')
    }, 2000)
  }

  return element
}

function redrawMessages () {
  messagesContainer.innerHTML = ''
  for (const message of messages) {
    drawMessage(message, true, true)
  }
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

function escapeHtml (str) {
  return str.replace(
    /[&<>'"]/g,
    tag =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
  )
}
