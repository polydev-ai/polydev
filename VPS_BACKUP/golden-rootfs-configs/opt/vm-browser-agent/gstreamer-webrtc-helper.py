#!/usr/bin/env python3
"""
GStreamer WebRTC Helper for VM Browser Agent

This helper process handles the GStreamer webrtcbin element and communicates
with the Node.js webrtc-server.js via JSON messages over stdin/stdout.

Communication Protocol (JSON over stdio):
- Node → Python: { "type": "REMOTE_SDP", "sdp": "..." }
- Node → Python: { "type": "REMOTE_CANDIDATE", "candidate": "...", "sdpMLineIndex": 0 }
- Python → Node: { "type": "LOCAL_SDP", "sdp": "..." }
- Python → Node: { "type": "ICE_CANDIDATE", "candidate": "...", "sdpMLineIndex": 0 }
- Python → Node: { "type": "LOG", "level": "info", "message": "..." }
- Python → Node: { "type": "READY_FOR_OFFER" }
"""

import sys
import json
import threading
import gi

gi.require_version('Gst', '1.0')
gi.require_version('GstWebRTC', '1.0')
gi.require_version('GstSdp', '1.0')

from gi.repository import Gst, GstWebRTC, GstSdp, GLib

# Initialize GStreamer
Gst.init(None)

class WebRTCController:
    def __init__(self):
        self.pipeline = None
        self.webrtc = None
        self.pending_candidates = []
        self.remote_description_set = False

        # Create GStreamer pipeline
        self.create_pipeline()

    def log(self, level, message):
        """Send log message to Node.js"""
        self.send_message({
            'type': 'LOG',
            'level': level,
            'message': message
        })

    def send_message(self, msg):
        """Send JSON message to Node.js via stdout"""
        try:
            sys.stdout.write(json.dumps(msg) + '\n')
            sys.stdout.flush()
        except Exception as e:
            sys.stderr.write(f'Error sending message: {e}\n')
            sys.stderr.flush()

    def create_pipeline(self):
        """Create GStreamer pipeline with webrtcbin"""
        try:
            self.log('info', 'Creating GStreamer pipeline with webrtcbin')

            # Create pipeline
            self.pipeline = Gst.Pipeline.new('webrtc-pipeline')

            # Video source (X11 screen capture)
            src = Gst.ElementFactory.make('ximagesrc', 'screen')
            src.set_property('use-damage', False)
            src.set_property('show-pointer', True)

            # Video processing
            queue1 = Gst.ElementFactory.make('queue')
            videoconvert = Gst.ElementFactory.make('videoconvert')
            videoscale = Gst.ElementFactory.make('videoscale')

            # Caps filter for resolution and framerate
            caps_str = 'video/x-raw,framerate=30/1,width=1280,height=720'
            caps = Gst.Caps.from_string(caps_str)
            capsfilter = Gst.ElementFactory.make('capsfilter')
            capsfilter.set_property('caps', caps)

            # VP8 encoder
            vp8enc = Gst.ElementFactory.make('vp8enc')
            vp8enc.set_property('deadline', 1)
            vp8enc.set_property('target-bitrate', 2000000)
            vp8enc.set_property('keyframe-max-dist', 120)
            vp8enc.set_property('cpu-used', 8)
            vp8enc.set_property('threads', 4)

            # RTP payloader
            rtpvp8pay = Gst.ElementFactory.make('rtpvp8pay')
            rtpvp8pay.set_property('pt', 96)
            rtpvp8pay.set_property('picture-id-mode', 2)  # 15-bit mode

            queue2 = Gst.ElementFactory.make('queue')

            # WebRTC bin
            self.webrtc = Gst.ElementFactory.make('webrtcbin', 'sendrecv')
            self.webrtc.set_property('bundle-policy', GstWebRTC.WebRTCBundlePolicy.MAX_BUNDLE)
            self.webrtc.set_property('stun-server', 'stun://stun.l.google.com:19302')

            # Add all elements to pipeline
            self.pipeline.add(src)
            self.pipeline.add(queue1)
            self.pipeline.add(videoconvert)
            self.pipeline.add(videoscale)
            self.pipeline.add(capsfilter)
            self.pipeline.add(vp8enc)
            self.pipeline.add(rtpvp8pay)
            self.pipeline.add(queue2)
            self.pipeline.add(self.webrtc)

            # Link elements
            if not src.link(queue1):
                raise Exception('Failed to link src -> queue1')
            if not queue1.link(videoconvert):
                raise Exception('Failed to link queue1 -> videoconvert')
            if not videoconvert.link(videoscale):
                raise Exception('Failed to link videoconvert -> videoscale')
            if not videoscale.link(capsfilter):
                raise Exception('Failed to link videoscale -> capsfilter')
            if not capsfilter.link(vp8enc):
                raise Exception('Failed to link capsfilter -> vp8enc')
            if not vp8enc.link(rtpvp8pay):
                raise Exception('Failed to link vp8enc -> rtpvp8pay')
            if not rtpvp8pay.link(queue2):
                raise Exception('Failed to link rtpvp8pay -> queue2')

            # CRITICAL FIX: Set pipeline to PAUSED before requesting dynamic pads
            # webrtcbin does NOT create requestable pads until pipeline is in PAUSED state
            self.log('info', 'Setting pipeline to PAUSED state before requesting dynamic pads')
            ret = self.pipeline.set_state(Gst.State.PAUSED)
            if ret == Gst.StateChangeReturn.FAILURE:
                # Get detailed error from GStreamer bus
                bus = self.pipeline.get_bus()
                msg = bus.pop_filtered(Gst.MessageType.ERROR)
                if msg:
                    err, debug = msg.parse_error()
                    self.log('error', f'GStreamer ERROR: {err.message}')
                    self.log('error', f'Debug info: {debug}')
                    raise Exception(f'Failed to pause pipeline: {err.message}')
                else:
                    self.log('error', 'Failed to pause pipeline (no GStreamer error message available)')
                    raise Exception('Failed to pause pipeline')

            # Wait for state change to complete
            self.pipeline.get_state(Gst.CLOCK_TIME_NONE)
            self.log('info', 'Pipeline is now in PAUSED state')

            # NOW request the dynamic pad from webrtcbin
            queue2_src = queue2.get_static_pad('src')
            webrtc_sink = self.webrtc.request_pad_simple('sink_%u')

            # Verify pad was created
            if webrtc_sink is None:
                raise Exception('Failed to request sink pad from webrtcbin - plugin may be missing')

            self.log('info', f'Successfully requested sink pad: {webrtc_sink.get_name()}')

            # Link the dynamic pad
            if queue2_src.link(webrtc_sink) != Gst.PadLinkReturn.OK:
                raise Exception('Failed to link queue2 -> webrtcbin')

            # Connect webrtcbin signals
            self.webrtc.connect('on-negotiation-needed', self.on_negotiation_needed)
            self.webrtc.connect('on-ice-candidate', self.on_ice_candidate)
            self.webrtc.connect('pad-added', self.on_pad_added)

            self.log('info', 'GStreamer pipeline created successfully')

            # Start pipeline (transition from PAUSED to PLAYING)
            ret = self.pipeline.set_state(Gst.State.PLAYING)
            if ret == Gst.StateChangeReturn.FAILURE:
                raise Exception('Failed to start pipeline')

            self.log('info', 'GStreamer pipeline started')

            # Signal Node.js that we're ready for the remote offer
            self.send_message({'type': 'READY_FOR_OFFER'})

        except Exception as e:
            self.log('error', f'Failed to create pipeline: {e}')
            sys.exit(1)

    def on_negotiation_needed(self, element):
        """Handle negotiation-needed signal from webrtcbin"""
        self.log('info', 'Negotiation needed')
        # We're receiving the offer first, so we create answer in set_remote_description

    def on_ice_candidate(self, element, mlineindex, candidate):
        """Handle ICE candidate generation"""
        self.log('info', f'ICE candidate generated: {candidate}')
        self.send_message({
            'type': 'ICE_CANDIDATE',
            'candidate': candidate,
            'sdpMLineIndex': mlineindex
        })

    def on_pad_added(self, element, pad):
        """Handle new pad added to webrtcbin"""
        self.log('info', f'Pad added: {pad.get_name()}')

    def set_remote_description(self, sdp_text):
        """Set remote SDP offer from browser"""
        try:
            self.log('info', 'Setting remote description (offer)')

            # Parse SDP
            res, sdp_msg = GstSdp.SDPMessage.new_from_text(sdp_text)
            if res != GstSdp.SDPResult.OK:
                raise Exception(f'Failed to parse SDP: {res}')

            # Create WebRTC session description
            offer = GstWebRTC.WebRTCSessionDescription.new(
                GstWebRTC.WebRTCSDPType.OFFER,
                sdp_msg
            )

            # Set remote description
            promise = Gst.Promise.new()
            self.webrtc.emit('set-remote-description', offer, promise)
            promise.interrupt()  # Wait for completion

            self.remote_description_set = True
            self.log('info', 'Remote description set successfully')

            # Create answer
            self.create_answer()

            # Process pending ICE candidates
            for candidate_info in self.pending_candidates:
                self.add_ice_candidate_internal(
                    candidate_info['candidate'],
                    candidate_info['sdpMLineIndex']
                )
            self.pending_candidates.clear()

        except Exception as e:
            self.log('error', f'Failed to set remote description: {e}')

    def create_answer(self):
        """Create SDP answer"""
        try:
            self.log('info', 'Creating SDP answer')

            def on_answer_created(promise):
                reply = promise.get_reply()
                if reply is None:
                    self.log('error', 'Failed to create answer: no reply')
                    return

                answer = reply.get_value('answer')

                # Set local description
                promise2 = Gst.Promise.new()
                self.webrtc.emit('set-local-description', answer, promise2)

                # Send answer to Node.js
                sdp_text = answer.sdp.as_text()
                self.log('info', 'Sending SDP answer to Node.js')
                self.send_message({
                    'type': 'LOCAL_SDP',
                    'sdp': sdp_text
                })

            # Create answer promise
            promise = Gst.Promise.new_with_change_func(on_answer_created)
            self.webrtc.emit('create-answer', None, promise)

        except Exception as e:
            self.log('error', f'Failed to create answer: {e}')

    def add_ice_candidate(self, candidate, sdp_mline_index):
        """Add remote ICE candidate from browser"""
        if not self.remote_description_set:
            # Queue candidates until remote description is set
            self.log('info', f'Queueing ICE candidate (remote description not set yet)')
            self.pending_candidates.append({
                'candidate': candidate,
                'sdpMLineIndex': sdp_mline_index
            })
        else:
            self.add_ice_candidate_internal(candidate, sdp_mline_index)

    def add_ice_candidate_internal(self, candidate, sdp_mline_index):
        """Actually add ICE candidate to webrtcbin"""
        try:
            self.log('info', f'Adding remote ICE candidate: {candidate}')
            self.webrtc.emit('add-ice-candidate', sdp_mline_index, candidate)
        except Exception as e:
            self.log('error', f'Failed to add ICE candidate: {e}')

    def stop(self):
        """Stop pipeline and cleanup"""
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)
            self.log('info', 'Pipeline stopped')

def handle_stdin():
    """Read commands from Node.js via stdin"""
    controller = WebRTCController()

    try:
        for line in sys.stdin:
            try:
                msg = json.loads(line.strip())
                msg_type = msg.get('type')

                if msg_type == 'REMOTE_SDP':
                    controller.set_remote_description(msg['sdp'])

                elif msg_type == 'REMOTE_CANDIDATE':
                    controller.add_ice_candidate(
                        msg['candidate'],
                        msg.get('sdpMLineIndex', 0)
                    )

                elif msg_type == 'STOP':
                    controller.stop()
                    break

            except json.JSONDecodeError as e:
                controller.log('error', f'Invalid JSON from stdin: {e}')
            except Exception as e:
                controller.log('error', f'Error handling message: {e}')

    except KeyboardInterrupt:
        controller.log('info', 'Received interrupt signal')
    finally:
        controller.stop()

def main():
    # Start GLib main loop in separate thread
    loop = GLib.MainLoop()
    loop_thread = threading.Thread(target=loop.run, daemon=True)
    loop_thread.start()

    # Handle stdin in main thread
    handle_stdin()

    # Stop loop
    loop.quit()
    loop_thread.join(timeout=1.0)

if __name__ == '__main__':
    main()
