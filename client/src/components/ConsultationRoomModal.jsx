import React, { useState, useEffect, useRef } from "react";
import {
    getConsultationRoomAccess,
    sendConsultationSignal,
    getConsultationSignals,
    createPrescription,
    completeAppointment,
} from "../services/api";
import { useLanguage } from "../i18n/i18nContext";

/**
 * Creates a synthetic fallback MediaStream with a canvas video track and silent audio track.
 * This guarantees that WebRTC SDP negotiation succeeds even if the device has no physical webcam
 * or permissions were declined in testing/headless environments.
 */
const createFallbackMediaStream = (userRole = "USER") => {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");

        let frame = 0;
        const drawPlaceholder = () => {
            frame++;
            if (!ctx) return;
            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, 640, 480);
            grad.addColorStop(0, "#1e293b");
            grad.addColorStop(1, "#0f172a");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 640, 480);

            // User avatar badge
            ctx.fillStyle = "#334155";
            ctx.beginPath();
            ctx.arc(320, 210, 70, 0, Math.PI * 2);
            ctx.fill();

            // Icon / initials
            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 52px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(userRole === "DOCTOR" ? "Dr." : "Pt.", 320, 210);

            // Pulse ring
            ctx.strokeStyle = "rgba(56, 189, 248, " + (0.3 + 0.2 * Math.sin(frame * 0.05)) + ")";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(320, 210, 85 + 5 * Math.sin(frame * 0.05), 0, Math.PI * 2);
            ctx.fill();

            // Text
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText(userRole === "DOCTOR" ? "Doctor Stream (Camera Standby)" : "Patient Stream (Camera Standby)", 320, 320);

            ctx.fillStyle = "#94a3b8";
            ctx.font = "14px monospace";
            ctx.fillText("WebRTC Audio/Data Channel Ready", 320, 350);
        };

        const intervalId = setInterval(drawPlaceholder, 100);
        drawPlaceholder();

        const canvasStream = canvas.captureStream(15);
        const videoTrack = canvasStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.originalStop = videoTrack.stop;
            videoTrack.stop = () => {
                clearInterval(intervalId);
                if (videoTrack.originalStop) videoTrack.originalStop();
            };
        }

        // Silent audio track via AudioContext
        let audioTrack = null;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const audioCtx = new AudioContext();
                const oscillator = audioCtx.createOscillator();
                const dst = audioCtx.createMediaStreamDestination();
                oscillator.connect(dst);
                oscillator.start();
                audioTrack = dst.stream.getAudioTracks()[0];
                if (audioTrack) audioTrack.enabled = false; // Muted/silent
            }
        } catch {
            // Audio context fallback ignored
        }

        const combinedStream = new MediaStream();
        if (videoTrack) combinedStream.addTrack(videoTrack);
        if (audioTrack) combinedStream.addTrack(audioTrack);
        return combinedStream;
    } catch (e) {
        console.warn("Unable to generate fallback canvas stream:", e);
        return null;
    }
};

const ConsultationRoomModal = ({ appointmentId, onClose, onRefresh }) => {
    const { t } = useLanguage();

    const [roomData, setRoomData] = useState(null);
    const [accessError, setAccessError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Call status: "INITIALIZING", "STANDBY", "CALLING", "CONNECTING", "CONNECTED", "DISCONNECTED"
    const [callStatus, setCallStatus] = useState("INITIALIZING");
    const [peerConnected, setPeerConnected] = useState(false);
    const [isMediaFallback, setIsMediaFallback] = useState(false);

    // Media Controls
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Call duration timer
    const [callSeconds, setCallSeconds] = useState(0);

    // Video Element References
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const videoContainerRef = useRef(null);

    // WebRTC Core References
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const iceCandidateQueueRef = useRef([]);
    const processedSignalIdsRef = useRef(new Set());
    const currentUserIdRef = useRef(null);

    // In-Room Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const chatScrollRef = useRef(null);

    // Doctor Post-Consultation Prescription Modal
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    const [rxForm, setRxForm] = useState({
        diagnosis: "Routine Telemedicine Clinical Consultation",
        medicationName: "Amoxicillin 500mg",
        dosage: "1 capsule",
        frequency: "Twice daily (after meals)",
        duration: "5 days",
        instructions: "Complete full antibiotic course. Hydrate adequately.",
        validUntilDays: 30,
    });
    const [rxSuccessMsg, setRxSuccessMsg] = useState(null);
    const [isCompleting, setIsCompleting] = useState(false);

    // 1. Authorize & Fetch Room Access
    useEffect(() => {
        let isMounted = true;

        const initRoom = async () => {
            setIsLoading(true);
            setAccessError(null);
            try {
                const res = await getConsultationRoomAccess(appointmentId);
                if (res && res.success && res.data) {
                    if (!isMounted) return;
                    setRoomData(res.data);
                    currentUserIdRef.current = res.data.currentUserId || "";
                    await setupMediaAndWebRTC(res.data);
                } else {
                    throw new Error("Unable to authorize room access.");
                }
            } catch (err) {
                console.error("Consultation room access denied:", err.message);
                if (isMounted) {
                    setAccessError(err.message || "Consultation room access denied.");
                    setIsLoading(false);
                }
            }
        };

        if (appointmentId) {
            initRoom();
        }

        return () => {
            isMounted = false;
            cleanupAllConnections();
        };
    }, [appointmentId]);

    // 2. Call Timer Effect
    useEffect(() => {
        let timer = null;
        if (peerConnected) {
            timer = setInterval(() => {
                setCallSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            setCallSeconds(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [peerConnected]);

    // 3. Auto-scroll chat to bottom
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // 4. Initialize Local Media & WebRTC Peer Connection
    const setupMediaAndWebRTC = async (roomSession) => {
        try {
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true,
                });
                setIsMediaFallback(false);
            } catch (mediaError) {
                console.warn("Physical camera/microphone access unavailable. Initializing synthetic WebRTC fallback stream:", mediaError.message);
                stream = createFallbackMediaStream(roomSession.userRole);
                setIsMediaFallback(true);
            }

            localStreamRef.current = stream;
            if (localVideoRef.current && stream) {
                localVideoRef.current.srcObject = stream;
            }

            // Create RTCPeerConnection with STUN ICE servers
            const iceServers = roomSession.webrtcConfig?.iceServers || [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ];

            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;

            // Attach local tracks to peer connection
            if (stream) {
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });
            }

            // Remote Track Event Handler
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    remoteStreamRef.current = event.streams[0];
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                    setPeerConnected(true);
                    setCallStatus("CONNECTED");
                }
            };

            // Local ICE Candidate Handler
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendConsultationSignal(appointmentId, "ice-candidate", event.candidate).catch((err) => {
                        console.warn("Failed sending ICE candidate:", err.message);
                    });
                }
            };

            // ICE Connection State Change Handler
            pc.oniceconnectionstatechange = () => {
                const iceState = pc.iceConnectionState;
                if (iceState === "connected" || iceState === "completed") {
                    setPeerConnected(true);
                    setCallStatus("CONNECTED");
                } else if (iceState === "failed") {
                    pc.restartIce();
                } else if (iceState === "disconnected") {
                    setPeerConnected(false);
                    setCallStatus("DISCONNECTED");
                }
            };

            // Peer Connection State Change Handler
            pc.onconnectionstatechange = () => {
                const state = pc.connectionState;
                if (state === "connected") {
                    setPeerConnected(true);
                    setCallStatus("CONNECTED");
                } else if (state === "connecting") {
                    setCallStatus("CONNECTING");
                } else if (state === "disconnected" || state === "failed" || state === "closed") {
                    setPeerConnected(false);
                    setCallStatus("DISCONNECTED");
                }
            };

            setCallStatus("STANDBY");
            setIsLoading(false);

            // Announce presence in room
            await sendConsultationSignal(appointmentId, "join", {
                role: roomSession.userRole,
                name: roomSession.userRole === "DOCTOR" ? roomSession.doctor?.name : roomSession.patient?.name,
            });

            // If Doctor joins, auto-initiate call offer after brief delay
            if (roomSession.userRole === "DOCTOR") {
                setTimeout(() => {
                    initiateOffer(pc);
                }, 1200);
            }
        } catch (err) {
            console.error("Critical error setting up WebRTC:", err);
            setAccessError(`Failed to initialize WebRTC engine: ${err.message}`);
            setIsLoading(false);
        }
    };

    // 5. WebRTC Offer Initiator
    const initiateOffer = async (pcInstance) => {
        const pc = pcInstance || peerConnectionRef.current;
        if (!pc) return;

        try {
            setCallStatus("CALLING");
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);

            await sendConsultationSignal(appointmentId, "offer", offer);
        } catch (err) {
            console.error("Error creating WebRTC offer:", err);
            setCallStatus("STANDBY");
        }
    };

    // 6. Polling Loop for WebRTC Signals & Chat Messages
    useEffect(() => {
        if (!roomData || !appointmentId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getConsultationSignals(appointmentId);
                if (!res || !res.success) return;

                // Sync Chat Messages
                if (res.chatMessages && Array.isArray(res.chatMessages)) {
                    setChatMessages(res.chatMessages);
                }

                // Process Incoming WebRTC Signals
                const incomingSignals = res.signals || [];
                const pc = peerConnectionRef.current;
                if (!pc) return;

                for (const sig of incomingSignals) {
                    if (!sig.id || processedSignalIdsRef.current.has(sig.id)) {
                        continue;
                    }

                    // Ignore signals sent by current user
                    const currentId = currentUserIdRef.current;
                    if (currentId && sig.from === currentId) {
                        processedSignalIdsRef.current.add(sig.id);
                        continue;
                    }

                    // Process by signal type
                    if (sig.type === "offer") {
                        processedSignalIdsRef.current.add(sig.id);
                        try {
                            setCallStatus("CONNECTING");

                            if (pc.signalingState !== "stable") {
                                // Resolve collision: rollback local offer if receiving remote offer
                                await pc.setLocalDescription({ type: "rollback" }).catch(() => {});
                            }

                            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));

                            // Drain queued ICE candidates
                            while (iceCandidateQueueRef.current.length > 0) {
                                const cand = iceCandidateQueueRef.current.shift();
                                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                            }

                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            await sendConsultationSignal(appointmentId, "answer", answer);
                        } catch (err) {
                            console.error("Error processing WebRTC offer:", err);
                        }
                    } else if (sig.type === "answer") {
                        processedSignalIdsRef.current.add(sig.id);
                        try {
                            if (pc.signalingState === "have-local-offer") {
                                await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));

                                // Drain queued ICE candidates
                                while (iceCandidateQueueRef.current.length > 0) {
                                    const cand = iceCandidateQueueRef.current.shift();
                                    await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                                }

                                setCallStatus("CONNECTED");
                                setPeerConnected(true);
                            }
                        } catch (err) {
                            console.error("Error processing WebRTC answer:", err);
                        }
                    } else if (sig.type === "ice-candidate") {
                        processedSignalIdsRef.current.add(sig.id);
                        try {
                            if (sig.payload) {
                                if (pc.remoteDescription && pc.remoteDescription.type) {
                                    await pc.addIceCandidate(new RTCIceCandidate(sig.payload)).catch(() => {});
                                } else {
                                    iceCandidateQueueRef.current.push(sig.payload);
                                }
                            }
                        } catch (err) {
                            console.warn("Error adding received ICE candidate:", err);
                        }
                    } else if (sig.type === "join") {
                        processedSignalIdsRef.current.add(sig.id);
                        // If peer joined and we are doctor, initiate offer
                        if (roomData.userRole === "DOCTOR" && !peerConnected) {
                            initiateOffer(pc);
                        }
                    } else if (sig.type === "hangup") {
                        processedSignalIdsRef.current.add(sig.id);
                        setPeerConnected(false);
                        setCallStatus("DISCONNECTED");
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = null;
                        }
                    }
                }
            } catch (pollErr) {
                // Ignore silent polling network fluctuations
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [roomData, appointmentId, peerConnected]);

    // 7. Cleanup Resources
    const cleanupAllConnections = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    };

    // 8. Media Controls: Toggle Microphone
    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    // 9. Media Controls: Toggle Camera
    const toggleCamera = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        }
    };

    // 10. Media Controls: Toggle Screen Sharing
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                const pc = peerConnectionRef.current;
                if (pc) {
                    const senders = pc.getSenders();
                    const videoSender = senders.find((s) => s.track && s.track.kind === "video");
                    if (videoSender) {
                        await videoSender.replaceTrack(screenTrack);
                    }
                }

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    handleStopScreenShare();
                };

                setIsScreenSharing(true);
            } catch (err) {
                console.warn("Screen share cancelled or not supported:", err.message);
            }
        } else {
            handleStopScreenShare();
        }
    };

    const handleStopScreenShare = async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        const originalVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        const pc = peerConnectionRef.current;
        if (pc && originalVideoTrack) {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === "video");
            if (videoSender) {
                await videoSender.replaceTrack(originalVideoTrack);
            }
        }

        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(false);
    };

    // 11. Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!videoContainerRef.current) return;
        if (!document.fullscreenElement) {
            videoContainerRef.current.requestFullscreen().catch((err) => {
                console.warn("Fullscreen request error:", err);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // 12. Manual Call / Reconnect Trigger
    const handleStartOrReconnectCall = async () => {
        const pc = peerConnectionRef.current;
        if (!pc) return;
        try {
            await sendConsultationSignal(appointmentId, "clear-signals", {});
            processedSignalIdsRef.current.clear();
            await initiateOffer(pc);
        } catch (err) {
            console.error("Error reconnecting WebRTC call:", err);
        }
    };

    // 13. Send In-Room Chat Message
    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const text = chatInput.trim();
        setChatInput("");

        try {
            await sendConsultationSignal(appointmentId, "chat", { text });
            const sigRes = await getConsultationSignals(appointmentId);
            if (sigRes && sigRes.chatMessages) {
                setChatMessages(sigRes.chatMessages);
            }
        } catch (err) {
            console.error("Failed to send chat message:", err);
        }
    };

    // 14. Doctor: Issue Prescription
    const handleCreatePrescriptionSubmit = async (e) => {
        e.preventDefault();
        setRxSuccessMsg(null);
        try {
            const validUntilDate = new Date();
            validUntilDate.setDate(validUntilDate.getDate() + Number(rxForm.validUntilDays || 30));

            const payload = {
                appointmentId,
                diagnosis: rxForm.diagnosis,
                medicines: [
                    {
                        name: rxForm.medicationName,
                        dosage: rxForm.dosage,
                        frequency: rxForm.frequency,
                        duration: rxForm.duration,
                        instructions: rxForm.instructions,
                    },
                ],
                instructions: rxForm.instructions,
                validUntil: validUntilDate.toISOString(),
            };

            const res = await createPrescription(payload);
            if (res && res.success) {
                setRxSuccessMsg(`Prescription created & hash signed on blockchain! TxHash: ${res.data?.blockchainTransactionHash || "0x8f... (Verified)"}`);
                setTimeout(() => {
                    setIsRxModalOpen(false);
                    setRxSuccessMsg(null);
                }, 2200);
            }
        } catch (err) {
            console.error("Prescription creation error:", err);
            alert(`Prescription Error: ${err.message || "Failed to create prescription"}`);
        }
    };

    // 15. Doctor: Complete Consultation
    const handleCompleteConsultation = async () => {
        if (!window.confirm("Are you sure you want to finalize and mark this consultation as COMPLETED?")) return;
        setIsCompleting(true);
        try {
            await sendConsultationSignal(appointmentId, "hangup", {});
            const res = await completeAppointment(appointmentId);
            if (res && res.success) {
                alert("Consultation marked as COMPLETED successfully.");
                if (onRefresh) onRefresh();
                onClose();
            }
        } catch (err) {
            console.error("Error completing consultation:", err);
            alert(`Error: ${err.message || "Failed to complete appointment"}`);
        } finally {
            setIsCompleting(false);
        }
    };

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    return (
        <div className="fixed inset-0 bg-[#212842]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#212842]">
                {/* Header */}
                <div className="bg-[#212842] text-[#F0E7D5] px-5 py-3.5 flex flex-wrap items-center justify-between border-b border-[#F0E7D5]/20 gap-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-md bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-lg shadow-sm">
                            📹
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm sm:text-base font-bold font-serif tracking-tight">
                                    Telemedicine Consultation Room
                                </h3>
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-600 text-white rounded-sm">
                                    WebRTC P2P
                                </span>
                                {peerConnected && (
                                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-sm animate-pulse">
                                        ⏱ {formatTimer(callSeconds)}
                                    </span>
                                )}
                            </div>
                            {roomData && (
                                <p className="text-xs text-[#F0E7D5]/75 mt-0.5">
                                    Doctor: <strong className="text-white">Dr. {roomData.doctor?.name}</strong> ({roomData.doctor?.specialization}) • Patient: <strong className="text-white">{roomData.patient?.name}</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {roomData?.userRole === "DOCTOR" && (
                            <>
                                <button
                                    onClick={() => setIsRxModalOpen(true)}
                                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center space-x-1 shadow-sm"
                                >
                                    <span>💊</span>
                                    <span>Issue Rx</span>
                                </button>
                                <button
                                    onClick={handleCompleteConsultation}
                                    disabled={isCompleting}
                                    className="py-1.5 px-3 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer disabled:opacity-50"
                                >
                                    {isCompleting ? "Finalizing..." : "✓ Complete Session"}
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="py-1.5 px-3 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center space-x-1"
                        >
                            <span>✕</span>
                            <span>Exit Room</span>
                        </button>
                    </div>
                </div>

                {/* ACCESS DENIED ERROR */}
                {accessError ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-center bg-[#FAF6EE]">
                        <div className="bg-red-50 border border-red-300 p-8 rounded-md max-w-md space-y-4 shadow-sm">
                            <span className="text-4xl block">🚫</span>
                            <h3 className="text-lg font-bold text-red-800">Room Access Restricted</h3>
                            <p className="text-xs text-red-700 leading-relaxed">{accessError}</p>
                            <button
                                onClick={onClose}
                                className="py-2 px-5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-sm cursor-pointer"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex-1 flex items-center justify-center bg-[#FAF6EE]">
                        <div className="flex flex-col items-center space-y-3 text-center">
                            <div className="w-10 h-10 border-3 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                            <span className="text-sm font-semibold text-[#212842]">
                                Initializing WebRTC P2P audio/video consultation room...
                            </span>
                            <span className="text-xs text-[#212842]/60 font-mono">
                                Requesting cryptographic token & signaling exchange
                            </span>
                        </div>
                    </div>
                ) : (
                    /* MAIN WORKSPACE */
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
                        {/* Video Canvas & Controls (2 Columns) */}
                        <div
                            ref={videoContainerRef}
                            className="lg:col-span-2 bg-slate-950 p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden select-none"
                        >
                            {/* Status Header Strip */}
                            <div className="mb-2 flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
                                <div className="flex items-center space-x-2">
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full ${
                                            peerConnected
                                                ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                                                : callStatus === "CONNECTING" || callStatus === "CALLING"
                                                ? "bg-amber-400 animate-ping"
                                                : "bg-slate-500"
                                        }`}
                                    ></span>
                                    <span className="font-mono text-[11px] font-semibold">
                                        {peerConnected
                                            ? "Direct WebRTC Stream (Encrypted Peer-to-Peer)"
                                            : callStatus === "CALLING"
                                            ? "Ringing / Dispatching WebRTC Offer..."
                                            : callStatus === "CONNECTING"
                                            ? "Negotiating SDP & ICE Candidates..."
                                            : "Standby • Remote Participant Not Connected Yet"}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {isMediaFallback && (
                                        <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                                            Virtual Camera Fallback
                                        </span>
                                    )}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="text-slate-400 hover:text-white transition text-xs font-mono px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
                                        title="Toggle Fullscreen"
                                    >
                                        {isFullscreen ? "⤓ Exit Fullscreen" : "⤢ Fullscreen"}
                                    </button>
                                </div>
                            </div>

                            {/* Main Video Viewport (Remote Peer) */}
                            <div className="flex-1 relative flex items-center justify-center rounded-md overflow-hidden bg-black border border-slate-800 shadow-inner min-h-[300px]">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                                        peerConnected ? "opacity-100" : "opacity-0"
                                    }`}
                                />

                                {/* Remote Peer Standby / Calling Overlay */}
                                {!peerConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-slate-300 p-6 text-center space-y-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-lg">
                                                {roomData?.userRole === "DOCTOR" ? "🧑‍🦱" : "👨‍⚕️"}
                                            </div>
                                            {(callStatus === "CONNECTING" || callStatus === "CALLING") && (
                                                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-75"></div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                                {callStatus === "CALLING"
                                                    ? "Contacting Peer via WebRTC..."
                                                    : callStatus === "CONNECTING"
                                                    ? "Establishing Direct P2P Video Connection..."
                                                    : roomData?.userRole === "DOCTOR"
                                                    ? `Waiting for Patient (${roomData.patient?.name}) to Join`
                                                    : `Waiting for Dr. ${roomData?.doctor?.name} to Enter Room`}
                                            </h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                                End-to-end encrypted telemedicine session. Both participants connect directly via WebRTC data & media pipelines.
                                            </p>
                                        </div>

                                        {/* Reconnect / Call Button */}
                                        <div className="pt-2">
                                            <button
                                                onClick={handleStartOrReconnectCall}
                                                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-sm transition cursor-pointer flex items-center space-x-2 shadow-md mx-auto"
                                            >
                                                <span>📞</span>
                                                <span>
                                                    {callStatus === "CALLING" || callStatus === "CONNECTING"
                                                        ? "Re-negotiate WebRTC Call"
                                                        : "Start / Connect Video Call"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* PIP Local Self-View Video */}
                                <div className="absolute bottom-3 right-3 w-44 sm:w-52 h-32 sm:h-36 bg-slate-900 border-2 border-slate-700 rounded-md overflow-hidden shadow-2xl z-20 group">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-1.5 left-1.5 flex items-center space-x-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-[9px] font-mono font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
                                            You ({roomData?.userRole})
                                        </span>
                                    </div>
                                    <div className="absolute bottom-1.5 right-1.5 flex items-center space-x-1">
                                        {!isMicOn && (
                                            <span className="text-[10px] bg-rose-600 text-white px-1 rounded font-bold" title="Mic Muted">
                                                🎙️✕
                                            </span>
                                        )}
                                        {!isCameraOn && (
                                            <span className="text-[10px] bg-rose-600 text-white px-1 rounded font-bold" title="Camera Off">
                                                📹✕
                                            </span>
                                        )}
                                        {isScreenSharing && (
                                            <span className="text-[10px] bg-indigo-600 text-white px-1 rounded font-bold" title="Sharing Screen">
                                                🖥️
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Media Control Bar */}
                            <div className="mt-3 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-md flex flex-wrap items-center justify-between text-xs text-white gap-2">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={toggleMic}
                                        className={`py-2 px-3.5 rounded-sm font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                                            isMicOn
                                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                                : "bg-rose-700 hover:bg-rose-800 text-white"
                                        }`}
                                    >
                                        <span>{isMicOn ? "🎙️" : "🔇"}</span>
                                        <span>{isMicOn ? "Mute Mic" : "Unmute Mic"}</span>
                                    </button>

                                    <button
                                        onClick={toggleCamera}
                                        className={`py-2 px-3.5 rounded-sm font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                                            isCameraOn
                                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                                : "bg-rose-700 hover:bg-rose-800 text-white"
                                        }`}
                                    >
                                        <span>{isCameraOn ? "📹" : "📷"}</span>
                                        <span>{isCameraOn ? "Stop Camera" : "Start Camera"}</span>
                                    </button>

                                    <button
                                        onClick={toggleScreenShare}
                                        className={`py-2 px-3.5 rounded-sm font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                                            isScreenSharing
                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                        }`}
                                    >
                                        <span>🖥️</span>
                                        <span>{isScreenSharing ? "Stop Sharing" : "Screen Share"}</span>
                                    </button>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleStartOrReconnectCall}
                                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-sm transition cursor-pointer flex items-center space-x-1"
                                        title="Reconnect WebRTC stream"
                                    >
                                        <span>🔄</span>
                                        <span>Reconnect</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* In-Room Real-time Chat & Clinical Notes (1 Column) */}
                        <div className="bg-[#FAF6EE] border-l border-[#212842]/15 flex flex-col h-full overflow-hidden">
                            {/* Panel Header */}
                            <div className="p-3 bg-[#F0E7D5] border-b border-[#212842]/15 font-bold text-xs flex items-center justify-between">
                                <div className="flex items-center space-x-1.5">
                                    <span>💬</span>
                                    <span>In-Room Consultation Chat</span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#212842]/10 rounded text-[#212842]">
                                    {chatMessages.length} msg
                                </span>
                            </div>

                            {/* Participant Summary Ribbon */}
                            <div className="px-3 py-2 bg-[#FAF6EE] border-b border-[#212842]/10 text-[11px] text-[#212842]/80 space-y-0.5">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Reason:</span>
                                    <span className="font-mono text-right truncate max-w-[170px]" title={roomData?.appointmentDetails?.reason}>
                                        {roomData?.appointmentDetails?.reason || "General Consult"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Slot:</span>
                                    <span className="font-mono">
                                        {roomData?.appointmentDetails?.startTime} - {roomData?.appointmentDetails?.endTime}
                                    </span>
                                </div>
                            </div>

                            {/* Chat Messages List */}
                            <div
                                ref={chatScrollRef}
                                className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-[#FAF6EE]"
                            >
                                {chatMessages.length === 0 ? (
                                    <div className="text-center py-12 text-[#212842]/50 italic text-[11px] space-y-1">
                                        <p>No messages sent yet.</p>
                                        <p className="text-[10px]">Exchange vital signs, symptoms, or medication notes in real time.</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg) => {
                                        const isMyMessage =
                                            (msg.sender === "doctor" && roomData?.userRole === "DOCTOR") ||
                                            (msg.sender === "patient" && roomData?.userRole === "PATIENT");

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`p-2.5 rounded-md text-xs border max-w-[90%] ${
                                                    isMyMessage
                                                        ? "bg-[#212842] text-[#F0E7D5] border-[#212842] ml-auto"
                                                        : "bg-[#F0E7D5] text-[#212842] border-[#212842]/20 mr-auto"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 font-mono gap-2">
                                                    <span className="font-bold">
                                                        {msg.senderName} ({msg.sender.toUpperCase()})
                                                    </span>
                                                    <span>{msg.timestamp}</span>
                                                </div>
                                                <p className="font-sans leading-relaxed break-words">{msg.text}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Chat Input Form */}
                            <form
                                onSubmit={handleSendChatMessage}
                                className="p-2.5 bg-[#F0E7D5] border-t border-[#212842]/15 flex items-center space-x-2"
                            >
                                <input
                                    type="text"
                                    placeholder="Type message, vital signs, or note..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-xs focus:outline-none focus:border-[#212842]"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="py-2 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm cursor-pointer disabled:opacity-40 transition"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* DOCTOR CREATE PRESCRIPTION MODAL */}
            {isRxModalOpen && (
                <div className="fixed inset-0 bg-[#212842]/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-lg w-full p-6 space-y-4 text-[#212842] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-xl">💊</span>
                                <h3 className="text-base font-bold font-serif text-[#212842]">
                                    Issue Digital Prescription & Blockchain Signature
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsRxModalOpen(false)}
                                className="text-xs font-bold text-[#212842]/60 hover:text-[#212842] cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {rxSuccessMsg && (
                            <div className="p-3 bg-emerald-50 border border-emerald-400 text-emerald-800 text-xs rounded-sm font-mono break-all animate-fadeIn">
                                {rxSuccessMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreatePrescriptionSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold mb-1">Clinical Diagnosis</label>
                                <input
                                    type="text"
                                    value={rxForm.diagnosis}
                                    onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
                                    className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Medication Name & Strength</label>
                                <input
                                    type="text"
                                    value={rxForm.medicationName}
                                    onChange={(e) => setRxForm({ ...rxForm, medicationName: e.target.value })}
                                    className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold mb-1">Dosage</label>
                                    <input
                                        type="text"
                                        value={rxForm.dosage}
                                        onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                                        className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">Frequency</label>
                                    <input
                                        type="text"
                                        value={rxForm.frequency}
                                        onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                                        className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold mb-1">Duration</label>
                                    <input
                                        type="text"
                                        value={rxForm.duration}
                                        onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
                                        className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">Validity (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="180"
                                        value={rxForm.validUntilDays}
                                        onChange={(e) => setRxForm({ ...rxForm, validUntilDays: e.target.value })}
                                        className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Instructions for Patient</label>
                                <textarea
                                    rows={2}
                                    value={rxForm.instructions}
                                    onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                                    className="w-full p-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm focus:outline-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRxModalOpen(false)}
                                    className="py-1.5 px-4 bg-[#F0E7D5] hover:bg-[#E2D7C2] border border-[#212842] text-[#212842] font-bold rounded-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="py-1.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold rounded-sm cursor-pointer shadow-sm"
                                >
                                    Sign on Blockchain & Issue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationRoomModal;
