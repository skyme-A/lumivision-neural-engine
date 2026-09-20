import cv2
import streamlit as st
from ultralytics import YOLO

# Page aesthetic setup
st.set_page_config(page_title="LumiVision Detector", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #faf7f5; }
    h1 { color: #db2777; font-family: 'sans-serif'; }
    </style>
""", unsafe_allow_html=True)

st.title("✨ LumiVision: Object Detector")
st.caption("Live AI Object Recognition with Confidence Control")

# Sidebar settings
st.sidebar.header("🌸 Vision Controls")
conf_threshold = st.sidebar.slider("Detection Confidence", min_value=0.1, max_value=1.0, value=0.45, step=0.05)
start_camera = st.sidebar.toggle("Start Camera Feed", value=False)

# Load lightweight YOLO model
@st.cache_resource
def load_model():
    return YOLO("yolov8n.pt")

model = load_model()

# Frame viewport placeholder
frame_placeholder = st.empty()
status_placeholder = st.sidebar.empty()

if start_camera:
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        st.error("⚠️ Could not open webcam. Please verify camera permissions.")
    else:
        status_placeholder.success("📷 Camera is LIVE")
        
        while start_camera:
            ret, frame = cap.read()
            if not ret:
                st.warning("Failed to grab camera frame.")
                break

            # Run detection using YOLO
            results = model(frame, conf=conf_threshold)

            # Draw detection boxes and labels onto the frame
            annotated_frame = results[0].plot()

            # Convert BGR (OpenCV format) to RGB (browser display format)
            frame_rgb = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
            frame_placeholder.image(frame_rgb, channels="RGB", use_container_width=True)

        cap.release()
else:
    status_placeholder.info("Camera is off")
    frame_placeholder.info("👈 Toggle **Start Camera Feed** in the sidebar to begin scanning!")