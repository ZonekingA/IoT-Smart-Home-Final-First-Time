import sys
import pickle
import json
import numpy as np
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# โหลดโมเดล AI
try:
    model_path = os.path.join(os.path.dirname(__file__), "xgboost_updated_model.pkl")
    print(f"Loading model from: {model_path}", file=sys.stderr)
    model = pickle.load(open(model_path, "rb"))
except Exception as e:
    print(json.dumps({"error": f"Model load failed: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

def predict_weather(temp, humidity, wind_speed):
    try:
        input_data = np.array([[temp, humidity, wind_speed]])
        print(f"Predicting with input: {input_data}", file=sys.stderr)
        prediction = model.predict(input_data)
        print(f"Prediction result: {prediction}", file=sys.stderr)
        return int(prediction[0])
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}), file=sys.stderr)
        return None

@app.route('/predict', methods=['POST'])
def weather_prediction():
    try:
        # รับข้อมูลจาก POST request
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        temp = data.get("temperature")
        humidity = data.get("humidity")
        wind_speed = data.get("wind_speed")

        if temp is None or humidity is None or wind_speed is None:
            return jsonify({"error": "Missing required data (temperature, humidity, wind_speed)"}), 400

        # พยากรณ์ฝน
        forecast = predict_weather(temp, humidity, wind_speed)
        if forecast is None:
            return jsonify({"error": "Prediction failed"}), 500

        return jsonify({"forecast": forecast})
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
