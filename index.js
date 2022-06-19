import firebase from 'firebase/app';
import 'firebase/firestore';
import './src/style.css';
import { firebaseConfig } from './config';

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const createCall = document.getElementById('createCall');
const answerButton = document.getElementById('answerButton');

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};
const options = {
  optional: [
    { DtlsSrtpKeyAgreement: true }, // требуется для соединения между Chrome и Firefox
    { RtpDataChannels: true } // требуется в Firefox для использования DataChannels API
  ]
}

const pc = new RTCPeerConnection(servers, options);
let localStream = null;
let remoteStream = null;

startButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  localVideo.srcObject = localStream;

  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  remoteVideo.srcObject = remoteStream;
}


createCall.onclick = async () => {
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const callDoc = firestore.collection("calls").doc();
  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id;

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  // Сохранить в БД offer хоста.
  await callDoc.set({ offer });

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Слушатель ответа от удаленного пира.
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    console.log('answer', data.answer);
    if (data.answer && !pc.currentRemoteDescription) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
}

answerButton.onclick = async () => {
  const callDoc = firestore.collection("calls").doc(callInput.value);
  const answerCandidates = callDoc.collection("answerCandidates");
  const offerCandidates = callDoc.collection("offerCandidates");

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const remoteDoc = await callDoc.get();
  const remoteOffer = await remoteDoc.data().offer;
  console.log(remoteOffer);
  pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    sdp: answerDescription.sdp,
    type: answerDescription.type,
  };

  // Сохранить в БД answer хоста.
  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}