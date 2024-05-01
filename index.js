// Start by making sure the `assemblyai` package is installed.
// If not, you can install it by running the following command:
// npm install assemblyai

import axios from "axios"
import fs from "fs/promises"
import path from "path"
import { input, select } from "@inquirer/prompts"

const run = async () => {
  const baseUrl = "https://api.assemblyai.com/v2"

  const headers = {
    authorization: process.env.ASSEMBLYAI_API_KEY,
  }
  const path = await input({
    message: "Enter the path of the audio file to transcribe:",
  })
  //   const path = "./5_common_sports_injuries.mp3"
  console.log("Loading audio file...")
  const audioData = await fs.readFile(path)
  const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
    headers,
  })
  const uploadUrl = uploadResponse.data.upload_url

  const data = {
    audio_url: uploadUrl, // You can also use a URL to an audio or video file on the web
    speaker_labels: true,
  }

  const url = `${baseUrl}/transcript`
  const response = await axios.post(url, data, { headers: headers })

  const transcriptId = response.data.id
  const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`
  console.log("Transcription started")

  while (true) {
    const pollingResponse = await axios.get(pollingEndpoint, {
      headers: headers,
    })
    const transcriptionResult = pollingResponse.data

    if (transcriptionResult.status === "completed") {
      console.log(transcriptionResult.text)
      let transcript = ""
      for (let utterance of transcriptionResult.utterances) {
        console.log(`Speaker ${utterance.speaker}: ${utterance.text}`)
        transcript += `Speaker ${utterance.speaker}: ${utterance.text}\n`
      }
      await fs.writeFile("./transcript.txt", transcript, "utf-8")
      console.log("Transcription complete\n")
      run()
      break
    } else if (transcriptionResult.status === "error") {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

const transcribe = async (buffer, filename) => {
  const nameWithoutExtension = filename.split(".")[0]
  const baseUrl = "https://api.assemblyai.com/v2"

  const headers = {
    authorization: process.env.ASSEMBLYAI_API_KEY,
  }
  // const path = await input({
  //   message: "Enter the path of the audio file to transcribe:",
  // })
  //   const path = "./5_common_sports_injuries.mp3"
  // const audioData = await fs.readFile(path)
  const uploadResponse = await axios.post(`${baseUrl}/upload`, buffer, {
    headers,
  })
  const uploadUrl = uploadResponse.data.upload_url

  const data = {
    audio_url: uploadUrl, // You can also use a URL to an audio or video file on the web
    speaker_labels: true,
  }

  const url = `${baseUrl}/transcript`
  const response = await axios.post(url, data, { headers: headers })

  const transcriptId = response.data.id
  const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`
  console.log("Started Transcribing file", nameWithoutExtension)

  while (true) {
    const pollingResponse = await axios.get(pollingEndpoint, {
      headers: headers,
    })
    const transcriptionResult = pollingResponse.data

    if (transcriptionResult.status === "completed") {
      // console.log(transcriptionResult.text)
      let transcript = ""
      for (let utterance of transcriptionResult.utterances) {
        // console.log(`Speaker ${utterance.speaker}: ${utterance.text}`)
        transcript += `Speaker ${utterance.speaker}: ${utterance.text}\n`
      }
      await fs.writeFile(
        `./output/${nameWithoutExtension}.txt`,
        transcript,
        "utf-8"
      )
      console.log("Finished transcribing file", nameWithoutExtension)
      console.log("\n\n")
      break
    } else if (transcriptionResult.status === "error") {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

const main = async () => {
  console.log("\n\n\n")
  console.log("Welcome to the AssemblyAI CLI")
  const option = await select({
    message: "What would you like to do?",
    choices: [
      {
        name: "Transcribe a single audio file",
        value: "single",
      },
      {
        name: "Transcribe multiple audio files",
        value: "batch",
      },
    ],
  })

  if (option === "single") {
    const filePath = await input({
      message: "Enter the path of the audio file:",
    })
    // const path = "./5_common_sports_injuries.mp3"
    const audioData = await fs.readFile(filePath)
    // handle single file
    // transcribe(audioData)
  } else {
    const folderPath = await input({
      message: "Enter the folder path of the audio files:",
    })
    const files = await fs.readdir(folderPath, {
      withFileTypes: true,
    })
    for (let i = 0; i < files.length; i++) {
      const filepath = path.join(files[i].path, files[i].name)
      const audioData = await fs.readFile(filepath)
      console.log("Loading file", files[i].name)
      await transcribe(audioData, files[i].name)
    }
    // console.log(res)
  }
  main()
}

main()
