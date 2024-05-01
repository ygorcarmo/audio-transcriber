// Start by making sure the `assemblyai` package is installed.
// If not, you can install it by running the following command:
// npm install assemblyai

import axios from "axios"
import fs from "fs/promises"
import { input } from "@inquirer/prompts"

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

run()
