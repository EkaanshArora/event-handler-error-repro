// JS reference to the container where the remote feeds belong
let remoteContainer = document.getElementById("remote-container");
let setListener = document.getElementById("set-listener");

/**
 * @name addVideoContainer
 * @param uid - uid of the user
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoContainer(uid) {
    let streamDiv = document.createElement("div"); // Create a new div for every stream
    streamDiv.id = `video_view_${uid}`;                       // Assigning id to div
    // streamDiv.style.transform = "rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    const uidText = document.createElement("p");
    uidText.textContent = uid;
    streamDiv.appendChild(uidText);
    remoteContainer.appendChild(streamDiv);      // Add new div to container
}
/**
 * @name removeVideoContainer
 * @param uid - uid of the user
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoContainer(uid) {
    let remDiv = document.getElementById(uid);
    remDiv && remDiv.parentNode.removeChild(remDiv);
}

function detach(uid) {
    let node = document.getElementById(uid);
    return node.parentElement.removeChild(node);
}


document.getElementById("start").onclick = async function () {
    // Client Setup
    // Defines a client for RTC
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    // set listener
    setListener.onclick = () => {
      console.log("Event handler set up");
      client.on("connection-state-change", (...args) => {
        console.log("new-state", args);
        // throw a sample error
        throw new Error("Sample error");
      });
    };
    const users = new Map();
    const videoStreams = new Map();
    window.users = users;
    window.videoStreams = videoStreams;

    // Get credentials from the form
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    let token = document.getElementById("token").value || null;

    // Create local tracks
    const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

    // Initialize the stop button
    initStop(client, localAudioTrack, localVideoTrack);
    window.localAudioTrack = localAudioTrack;
    window.localVideoTrack = localVideoTrack;

    // Play the local track
    localVideoTrack.play('me');

    // Set up event listeners for remote users publishing or unpublishing tracks
    client.on("user-published", async (user, mediaType) => {
        users.set(user.uid, user);
        const track = await client.subscribe(user, mediaType); // subscribe when a user publishes
        if (mediaType === "video") {
            videoStreams.set(user.uid, track);
            addVideoContainer(String(user.uid)) // uses helper method to add a container for the videoTrack
            user.videoTrack.play(`video_view_${user.uid}`);
            // remoteContainer.appendChild(elementRef);
        }
        if (mediaType === "audio") {
            user.audioTrack.play(); // audio does not need a DOM element
        }
    });
    client.on("user-unpublished", async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid) // removes the injected container
        }
    });

    // Join a channnel and retrieve the uid for local user
    const _uid = await client.join(appId, channelId, token, null);
    await client.publish([localAudioTrack, localVideoTrack]);
};

function initStop(client, localAudioTrack, localVideoTrack) {
    const stopBtn = document.getElementById('stop');
    stopBtn.disabled = false; // Enable the stop button
    setListener.disabled = false; // Enable the stop button
    stopBtn.onclick = null; // Remove any previous event listener
    stopBtn.onclick = function () {
        client.unpublish(); // stops sending audio & video to agora
        localVideoTrack.stop(); // stops video track and removes the player from DOM
        localVideoTrack.close(); // Releases the resource
        localAudioTrack.stop();  // stops audio track
        localAudioTrack.close(); // Releases the resource
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid) // Clean up DOM
            }
            client.unsubscribe(user); // unsubscribe from the user
        });
        client.removeAllListeners(); // Clean up the client object to avoid memory leaks
        stopBtn.disabled = true;
    }
}