"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { callsApi, type CallData, type CallType } from "@/lib/api";
import {
  acceptCallViaSocket,
  endCallViaSocket,
  inviteCallViaSocket,
  rejectCallViaSocket,
  sendCallAnswerViaSocket,
  sendCallIceCandidateViaSocket,
  sendCallOfferViaSocket,
  type CallEventPayload,
  type CallIcePayload,
  type CallSdpPayload,
  type MessagingSocket,
} from "@/lib/messaging-socket";
import { useMessaging } from "@/components/messaging/messaging-provider";
import {
  fallbackIceConfig,
  logSelectedCandidateType,
  logSignalingFailure,
  toCallErrorMessage,
} from "@/lib/call-diagnostics";
import { formatCallDuration } from "@/lib/messaging";

type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended" | "error";

interface CallUiState {
  phase: CallPhase;
  call: CallData | null;
  peerName: string;
  error: string;
  muted: boolean;
  cameraOff: boolean;
  durationSeconds: number;
  facingMode: "user" | "environment";
  canSwitchCamera: boolean;
  fullscreen: boolean;
  speakerSelectionSupported: boolean;
}

interface StartCallOptions {
  conversationId: string;
  calleeUserId: string;
  callType: CallType;
  peerName: string;
}

interface CallManagerContextValue {
  state: CallUiState;
  startCall: (options: StartCallOptions) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

const defaultState: CallUiState = {
  phase: "idle",
  call: null,
  peerName: "",
  error: "",
  muted: false,
  cameraOff: false,
  durationSeconds: 0,
  facingMode: "user",
  canSwitchCamera: false,
  fullscreen: false,
  speakerSelectionSupported: false,
};

const CallManagerContext = createContext<CallManagerContextValue | null>(null);

export function useCallManager(): CallManagerContextValue {
  const value = useContext(CallManagerContext);
  if (!value) throw new Error("useCallManager must be used inside CallManagerProvider.");
  return value;
}

interface Props {
  token: string | null;
  userId: string | null;
  children: React.ReactNode;
}

export function CallManagerProvider({ token, userId, children }: Props) {
  const { socket } = useMessaging();
  const [state, setState] = useState<CallUiState>(() => ({
    ...defaultState,
    speakerSelectionSupported:
      typeof document !== "undefined" &&
      typeof HTMLMediaElement !== "undefined" &&
      "setSinkId" in HTMLMediaElement.prototype,
  }));
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const stateRef = useRef(state);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<number | null>(null);
  const iceConfigRef = useRef<RTCConfiguration | null>(null);
  const answerTimeoutRef = useRef<number | null>(null);
  const iceRestartRef = useRef(false);
  const negotiationReadyRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAnswerTimeout = useCallback(() => {
    if (answerTimeoutRef.current) {
      window.clearTimeout(answerTimeoutRef.current);
      answerTimeoutRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setState((current) =>
        current.phase === "connected"
          ? { ...current, durationSeconds: current.durationSeconds + 1 }
          : current,
      );
    }, 1000);
  }, [stopTimer]);

  const cleanupMedia = useCallback(() => {
    clearAnswerTimeout();
    stopTimer();
    pendingCandidatesRef.current = [];
    iceRestartRef.current = false;
    negotiationReadyRef.current = false;
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.onicecandidateerror = null;
      peerRef.current.oniceconnectionstatechange = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.onnegotiationneeded = null;
      peerRef.current.ontrack = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, [clearAnswerTimeout, stopTimer]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const getIceConfig = useCallback(async (): Promise<RTCConfiguration> => {
    if (iceConfigRef.current) return iceConfigRef.current;
    if (!token) {
      console.warn("[call] ICE config unavailable; using STUN fallback");
      return fallbackIceConfig();
    }
    try {
      const res = await callsApi.getConfig(token);
      const config: RTCConfiguration = { iceServers: res.data.iceServers as RTCIceServer[] };
      iceConfigRef.current = config;
      return config;
    } catch (error) {
      logSignalingFailure("call:config", error);
      console.warn("[call] ICE config unavailable; using STUN fallback");
      return fallbackIceConfig();
    }
  }, [token]);

  const ensurePeer = useCallback(
    async (socketConn: MessagingSocket, call: CallData) => {
      if (peerRef.current) return peerRef.current;
      const config = await getIceConfig();
      const pc = new RTCPeerConnection(config);
      peerRef.current = pc;
      iceRestartRef.current = false;
      negotiationReadyRef.current = false;
      let handlingFailure = false;

      const handleConnectionFailure = () => {
        const current = stateRef.current;
        if (current.call?.id !== call.id || handlingFailure) return;
        handlingFailure = true;

        if (!iceRestartRef.current) {
          iceRestartRef.current = true;
          console.warn(`[call] ICE failed; restarting call=${call.id}`);
          try {
            pc.restartIce();
          } catch (error) {
            logSignalingFailure("ice-restart", error);
          }
          setState((stateNow) =>
            stateNow.call?.id === call.id
              ? { ...stateNow, error: "Connection interrupted. Reconnecting…" }
              : stateNow,
          );
          window.setTimeout(() => {
            handlingFailure = false;
          }, 5000);
          return;
        }

        handlingFailure = false;
        console.error(`[call] connection failed after ICE restart call=${call.id}`);
        setState((stateNow) =>
          stateNow.call?.id === call.id
            ? {
                ...stateNow,
                phase: "error",
                error: "Connection failed after retry. Check your network and try again.",
              }
            : stateNow,
        );
      };

      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      setRemoteStream(remote);

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        } else {
          remote.addTrack(event.track);
          setRemoteStream(new MediaStream(remote.getTracks()));
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendCallIceCandidateViaSocket(socketConn, call.id, event.candidate.toJSON());
        }
      };
      pc.onicecandidateerror = (event) => {
        console.warn(
          `[call] ICE candidate error call=${call.id} code=${event.errorCode} text=${event.errorText}`,
        );
      };
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.info(`[call] ICE state call=${call.id} state=${state}`);
        if (state === "connected" || state === "completed") {
          clearAnswerTimeout();
          void logSelectedCandidateType(pc, call.id);
        }
        if (state === "failed") handleConnectionFailure();
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.info(`[call] connection state call=${call.id} state=${state}`);
        if (state === "connected") {
          setState((current) => (current.call?.id === call.id ? { ...current, phase: "connected", error: "" } : current));
          clearAnswerTimeout();
          startTimer();
        } else if (state === "failed") {
          handleConnectionFailure();
        } else if (state === "disconnected") {
          setState((current) =>
            current.call?.id === call.id && current.phase === "connected"
              ? { ...current, error: "Connection interrupted. Trying to recover…" }
              : current,
          );
        }
      };
      pc.onnegotiationneeded = () => {
        if (!negotiationReadyRef.current || call.caller_user_id !== userId) return;
        const current = stateRef.current;
        if (current.call?.id !== call.id) return;
        void (async () => {
          try {
            const offer = await pc.createOffer({
              iceRestart: iceRestartRef.current,
            });
            await pc.setLocalDescription(offer);
            const ack = await sendCallOfferViaSocket(socketConn, call.id, offer);
            if (!ack.success) logSignalingFailure("call:offer", ack.error);
          } catch (error) {
            logSignalingFailure("call:offer", error);
          }
        })();
      };
      return pc;
    },
    [clearAnswerTimeout, getIceConfig, startTimer, userId],
  );

  const getLocalStream = useCallback(async (callType: CallType): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calling is not supported in this browser.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
    } catch (error) {
      throw new Error(
        toCallErrorMessage(error, "Could not access microphone or camera."),
      );
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    let canSwitchCamera = false;
    if (callType === "video" && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        canSwitchCamera = devices.filter((d) => d.kind === "videoinput").length > 1;
      } catch {
        canSwitchCamera = false;
      }
    }
    setState((current) => ({
      ...current,
      facingMode: "user",
      canSwitchCamera,
      cameraOff: false,
    }));
    return stream;
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore invalid late candidates
      }
    }
  }, []);

  const finalize = useCallback(
    (message = "") => {
      cleanupMedia();
      setState((current) => ({
        ...defaultState,
        phase: message ? "error" : "ended",
        error: message,
        durationSeconds: current.durationSeconds,
        call: current.call,
        peerName: current.peerName,
        speakerSelectionSupported: current.speakerSelectionSupported,
      }));
      window.setTimeout(() => {
        setState(defaultState);
      }, 1800);
    },
    [cleanupMedia],
  );

  const startAnswerTimeout = useCallback(
    (callId: string) => {
      clearAnswerTimeout();
      answerTimeoutRef.current = window.setTimeout(() => {
        const current = stateRef.current;
        if (current.call?.id !== callId || current.phase === "connected") return;
        console.warn(`[call] no answer after 30000ms call=${callId}`);
        if (socket) void endCallViaSocket(socket, callId, "timeout");
        cleanupMedia();
        setState({
          ...defaultState,
          phase: "error",
          call: current.call,
          peerName: current.peerName,
          durationSeconds: current.durationSeconds,
          speakerSelectionSupported: current.speakerSelectionSupported,
          error: "No answer after 30 seconds. The other user may be offline or unable to answer.",
        });
      }, 30_000);
    },
    [clearAnswerTimeout, cleanupMedia, socket],
  );

  const startCall = useCallback(
    async ({ conversationId, calleeUserId, callType, peerName }: StartCallOptions) => {
      if (!socket || !token || !userId) {
        setState({ ...defaultState, phase: "error", error: "Sign in and connect to start a call." });
        return;
      }
      if (!socket.connected) {
        setState({
          ...defaultState,
          phase: "error",
          peerName,
          error: "The other user is offline or unavailable. Check your connection and try again.",
        });
        return;
      }
      if (stateRef.current.phase !== "idle") return;
      try {
        setState({ ...defaultState, phase: "outgoing", peerName });
        const stream = await getLocalStream(callType);
        const inviteAck = await inviteCallViaSocket(socket, {
          conversation_id: conversationId,
          callee_user_id: calleeUserId,
          call_type: callType,
        });
        if (!inviteAck.success) {
          logSignalingFailure("call:invite", inviteAck.error);
          throw new Error(toCallErrorMessage(inviteAck.error, "Could not start the call."));
        }
        if (!inviteAck.data?.call) {
          throw new Error("Could not start the call.");
        }
        const call = inviteAck.data.call;
        setState({ ...defaultState, phase: "outgoing", call, peerName });
        const pc = await ensurePeer(socket, call);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const offerAck = await sendCallOfferViaSocket(socket, call.id, offer);
        if (!offerAck.success) {
          logSignalingFailure("call:offer", offerAck.error);
          throw new Error(toCallErrorMessage(offerAck.error, "Could not send call offer."));
        }
        negotiationReadyRef.current = true;
        startAnswerTimeout(call.id);
      } catch (err) {
        const call = stateRef.current.call;
        if (call && socket) {
          void endCallViaSocket(socket, call.id, "failed");
        }
        cleanupMedia();
        setState({
          ...defaultState,
          phase: "error",
          peerName,
          error: toCallErrorMessage(err, "Could not start the call."),
        });
        window.setTimeout(() => setState(defaultState), 2500);
      }
    },
    [socket, token, userId, getLocalStream, ensurePeer, cleanupMedia, startAnswerTimeout],
  );

  const acceptIncomingCall = useCallback(async () => {
    const current = stateRef.current;
    if (!socket || !current.call || current.phase !== "incoming") return;
    try {
      setState((s) => ({ ...s, phase: "connecting", error: "" }));
      const stream = await getLocalStream(current.call.call_type);
      const pc = await ensurePeer(socket, current.call);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const ack = await acceptCallViaSocket(socket, current.call.id);
      if (!ack.success) {
        logSignalingFailure("call:accept", ack.error);
        throw new Error(toCallErrorMessage(ack.error, "Could not accept the call."));
      }
      if (!ack.data?.call) {
        throw new Error("Could not accept the call.");
      }
      const acceptedCall = ack.data.call;
      setState((s) => ({ ...s, call: acceptedCall, phase: "connecting" }));
      if (pc.remoteDescription) {
        await flushPendingCandidates(pc);
      }
      if (pc.signalingState === "have-remote-offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const answerAck = await sendCallAnswerViaSocket(socket, current.call.id, answer);
        if (!answerAck.success) {
          logSignalingFailure("call:answer", answerAck.error);
          throw new Error(toCallErrorMessage(answerAck.error, "Could not answer the call."));
        }
        negotiationReadyRef.current = true;
      }
    } catch (err) {
      const call = stateRef.current.call;
      if (call && socket) void endCallViaSocket(socket, call.id, "failed");
      cleanupMedia();
      setState({
        ...defaultState,
        phase: "error",
        error: toCallErrorMessage(err, "Could not accept the call."),
      });
      window.setTimeout(() => setState(defaultState), 2500);
    }
  }, [socket, getLocalStream, ensurePeer, flushPendingCandidates, cleanupMedia]);

  const rejectIncomingCall = useCallback(async () => {
    const current = stateRef.current;
    if (!socket || !current.call) return;
    try {
      await rejectCallViaSocket(socket, current.call.id, "rejected");
    } finally {
      cleanupMedia();
      setState(defaultState);
    }
  }, [socket, cleanupMedia]);

  const endActiveCall = useCallback(async () => {
    const current = stateRef.current;
    if (!socket || !current.call) {
      cleanupMedia();
      setState(defaultState);
      return;
    }
    try {
      await endCallViaSocket(socket, current.call.id, "hangup");
    } finally {
      finalize();
    }
  }, [socket, cleanupMedia, finalize]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const nextMuted = !tracks[0]!.enabled ? false : true;
    tracks.forEach((t) => {
      t.enabled = !nextMuted ? true : false;
    });
    setState((current) => ({ ...current, muted: tracks.every((t) => !t.enabled) }));
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return;
    tracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setState((current) => ({ ...current, cameraOff: tracks.every((t) => !t.enabled) }));
  }, []);

  const switchCamera = useCallback(async () => {
    const current = stateRef.current;
    const pc = peerRef.current;
    if (
      !pc ||
      !current.call ||
      current.call.call_type !== "video" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return;
    }

    const nextFacing: "user" | "environment" =
      current.facingMode === "user" ? "environment" : "user";
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: nextFacing } },
      });
      const nextTrack = nextStream.getVideoTracks()[0];
      if (!nextTrack) {
        nextStream.getTracks().forEach((t) => t.stop());
        return;
      }
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) {
        nextTrack.stop();
        return;
      }

      const previousStream = localStreamRef.current;
      const previousVideoTracks = previousStream?.getVideoTracks() ?? [];
      const previousEnabled = previousVideoTracks.every((t) => t.enabled)
        ? previousVideoTracks.length === 0
          ? !current.cameraOff
          : true
        : false;
      nextTrack.enabled = previousEnabled;

      await sender.replaceTrack(nextTrack);
      previousVideoTracks.forEach((t) => {
        previousStream?.removeTrack(t);
        t.stop();
      });
      if (previousStream) {
        previousStream.addTrack(nextTrack);
        localStreamRef.current = previousStream;
        setLocalStream(new MediaStream(previousStream.getTracks()));
      } else {
        localStreamRef.current = nextStream;
        setLocalStream(nextStream);
      }
      setState((s) => ({ ...s, facingMode: nextFacing }));
    } catch {
      setState((s) => ({
        ...s,
        error: "Could not switch camera on this device.",
      }));
      window.setTimeout(() => {
        setState((s) => (s.error === "Could not switch camera on this device." ? { ...s, error: "" } : s));
      }, 2500);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    const element = overlayRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
    } catch {
      // fullscreen may be unsupported or blocked
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFullscreenChange = () => {
      setState((current) => ({
        ...current,
        fullscreen: Boolean(document.fullscreenElement),
      }));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!socket || !userId) return;

    const onIncoming = (payload: CallEventPayload) => {
      const call = payload?.call;
      if (!call || call.callee_user_id !== userId) return;
      if (stateRef.current.phase !== "idle") {
        void rejectCallViaSocket(socket, call.id, "busy");
        return;
      }
      setState({
        ...defaultState,
        phase: "incoming",
        call,
        peerName: call.caller?.display_name ?? "AgroConnect user",
      });
    };

    const onAccepted = async (payload: CallEventPayload) => {
      const call = payload?.call;
      if (!call || stateRef.current.call?.id !== call.id) return;
      setState((current) => ({ ...current, call, phase: "connecting" }));
    };

    const onRejected = (payload: CallEventPayload) => {
      const call = payload?.call;
      if (!call || stateRef.current.call?.id !== call.id) return;
      clearAnswerTimeout();
      cleanupMedia();
      setState({ ...defaultState, phase: "error", error: "Call declined.", peerName: stateRef.current.peerName, call });
      window.setTimeout(() => setState(defaultState), 2000);
    };

    const onEnded = (payload: CallEventPayload) => {
      const call = payload?.call;
      if (!call || stateRef.current.call?.id !== call.id) return;
      finalize(call.status === "missed" ? "Call missed." : "");
    };

    const onFailed = (payload: { call_id?: string; message?: string }) => {
      if (payload?.call_id && stateRef.current.call?.id !== payload.call_id) return;
      clearAnswerTimeout();
      cleanupMedia();
      setState({ ...defaultState, phase: "error", error: payload?.message || "Call failed." });
      window.setTimeout(() => setState(defaultState), 2500);
    };

    const onOffer = async (payload: CallSdpPayload) => {
      const { call_id, sdp } = payload || {};
      if (!call_id || !sdp) return;
      const current = stateRef.current;
      if (current.call?.id !== call_id) return;
      try {
        const pc = await ensurePeer(socket, current.call);
        await pc.setRemoteDescription(sdp as RTCSessionDescriptionInit);
        await flushPendingCandidates(pc);
        if (current.phase === "incoming") {
          // wait for explicit accept
          return;
        }
        if (
          current.call.callee_user_id === userId &&
          pc.signalingState === "have-remote-offer"
        ) {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const answerAck = await sendCallAnswerViaSocket(socket, call_id, answer);
          if (!answerAck.success) {
            logSignalingFailure("call:answer", answerAck.error);
          }
        }
      } catch (error) {
        logSignalingFailure("call:offer", error);
      }
    };

    const onAnswer = async (payload: CallSdpPayload) => {
      const { call_id, sdp } = payload || {};
      if (!call_id || !sdp) return;
      const current = stateRef.current;
      if (current.call?.id !== call_id) return;
      clearAnswerTimeout();
      try {
        const pc = await ensurePeer(socket, current.call);
        await pc.setRemoteDescription(sdp as RTCSessionDescriptionInit);
        await flushPendingCandidates(pc);
      } catch (error) {
        logSignalingFailure("call:answer", error);
      }
    };

    const onCandidate = async (payload: CallIcePayload) => {
      const { call_id, candidate } = payload || {};
      if (!call_id || !candidate) return;
      const current = stateRef.current;
      if (current.call?.id !== call_id) return;
      const pc = peerRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate as RTCIceCandidateInit);
        return;
      }
      try {
        await pc.addIceCandidate(candidate as RTCIceCandidateInit);
      } catch (error) {
        logSignalingFailure("call:ice-candidate", error);
      }
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);
    socket.on("call:failed", onFailed);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onCandidate);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
      socket.off("call:failed", onFailed);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onCandidate);
    };
  }, [socket, userId, cleanupMedia, clearAnswerTimeout, ensurePeer, finalize, flushPendingCandidates]);

  const value = useMemo(
    () => ({
      state,
      startCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endActiveCall,
      toggleMute,
      toggleCamera,
      switchCamera,
      toggleFullscreen,
    }),
    [state, startCall, acceptIncomingCall, rejectIncomingCall, endActiveCall, toggleMute, toggleCamera, switchCamera, toggleFullscreen],
  );

  return (
    <CallManagerContext.Provider value={value}>
      {children}
      <CallOverlay
        overlayRef={overlayRef}
        state={state}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
        onEnd={endActiveCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onSwitchCamera={() => void switchCamera()}
        onToggleFullscreen={() => void toggleFullscreen()}
      />
    </CallManagerContext.Provider>
  );
}

function StreamVideo({
  stream,
  muted,
  className,
  speakerSelectionSupported,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  speakerSelectionSupported?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    const sinkEl = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
    if (!muted && speakerSelectionSupported && typeof sinkEl.setSinkId === "function") {
      void sinkEl.setSinkId("default").catch(() => undefined);
    }
  }, [stream, muted, speakerSelectionSupported]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function CallOverlay({
  overlayRef,
  state,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleFullscreen,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  state: CallUiState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onEnd: () => Promise<void>;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleFullscreen: () => void;
}) {
  if (state.phase === "idle") return null;
  const isVideo = state.call?.call_type === "video";
  const title =
    state.phase === "incoming"
      ? `Incoming ${isVideo ? "video" : "audio"} call`
      : state.phase === "outgoing"
        ? `Calling ${state.peerName || "contact"}`
        : state.phase === "connecting"
          ? "Connecting…"
          : state.phase === "connected"
            ? state.peerName || "In call"
            : state.phase === "error"
              ? "Call unavailable"
              : "Call ended";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Call">
      <div ref={overlayRef} className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-deep-navy p-4 text-white">
          {isVideo && (state.phase === "connected" || state.phase === "connecting") ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/40">
              <StreamVideo
                stream={remoteStream}
                speakerSelectionSupported={state.speakerSelectionSupported}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-xl border border-white/20 bg-black/50 sm:h-32 sm:w-24">
                <StreamVideo stream={localStream} muted className="h-full w-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center rounded-2xl bg-white/5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
                {(state.peerName || "A").charAt(0).toUpperCase()}
              </div>
              <p className="mt-3 text-sm text-white/70">{isVideo ? "Video call" : "Audio call"}</p>
              {state.phase === "connected" && (
                <p className="mt-1 text-lg font-semibold">{formatCallDuration(state.durationSeconds)}</p>
              )}
              {state.speakerSelectionSupported && (
                <p className="mt-2 text-[11px] text-white/55">Speaker output selection supported by this browser.</p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <p className="font-heading text-lg font-bold text-deep-navy">{title}</p>
            {state.call && state.phase !== "incoming" && (
              <p className="text-xs text-deep-navy/55">
                {state.call.call_type === "video" ? "Video call" : "Audio call"}
                {state.phase === "connected" ? ` · ${formatCallDuration(state.durationSeconds)}` : ""}
              </p>
            )}
            {state.error && <p className="mt-1 text-sm text-red-700">{state.error}</p>}
            {state.phase === "incoming" && state.call && (
              <p className="mt-1 text-sm text-deep-navy/65">{state.peerName || "Someone"} is calling you.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {state.phase === "incoming" ? (
              <>
                <button type="button" onClick={() => void onAccept()} className="flex-1 rounded-full bg-agro-green px-4 py-2.5 text-sm font-bold text-white hover:bg-deep-navy">
                  Accept
                </button>
                <button type="button" onClick={() => void onReject()} className="flex-1 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100">
                  Decline
                </button>
              </>
            ) : state.phase === "error" || state.phase === "ended" ? null : (
              <>
                <button type="button" onClick={onToggleMute} className={`rounded-full px-4 py-2 text-sm font-semibold ${state.muted ? "bg-amber-100 text-amber-800" : "bg-soft-bg text-deep-navy"}`}>
                  {state.muted ? "Unmute" : "Mute"}
                </button>
                {isVideo && (
                  <>
                    <button type="button" onClick={onToggleCamera} className={`rounded-full px-4 py-2 text-sm font-semibold ${state.cameraOff ? "bg-amber-100 text-amber-800" : "bg-soft-bg text-deep-navy"}`}>
                      {state.cameraOff ? "Camera on" : "Camera off"}
                    </button>
                    {state.canSwitchCamera && (
                      <button type="button" onClick={onSwitchCamera} className="rounded-full bg-soft-bg px-4 py-2 text-sm font-semibold text-deep-navy">
                        Switch camera
                      </button>
                    )}
                    <button type="button" onClick={onToggleFullscreen} className="rounded-full bg-soft-bg px-4 py-2 text-sm font-semibold text-deep-navy">
                      {state.fullscreen ? "Exit full screen" : "Full screen"}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => void onEnd()} className="ml-auto rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
                  {state.phase === "outgoing" ? "Cancel" : "End call"}
                </button>
              </>
            )}
          </div>
          <p className="text-[11px] text-deep-navy/45">
            Calls use authenticated signaling. Audio/video quality depends on your network and TURN configuration.
            {state.speakerSelectionSupported ? " Browser speaker-output selection is supported where the device exposes it." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
