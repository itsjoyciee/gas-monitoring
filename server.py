from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import mysql.connector
from mysql.connector import Error
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Requests

# MySQL Database Configuration
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'your_username',
    'password': 'your_password',
    'database': 'your_database_name'
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def init_db():
    # This is just for initialization if needed
    # Your tables already exist according to your info
    pass

@app.route('/api/health', methods=['GET'])
def health_check():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    # Get database stats
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Get counts from all tables
            cursor.execute("SELECT COUNT(*) as count FROM gas_readings")
            gas_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM notifications")
            notif_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM sensor_metadata")
            meta_count = cursor.fetchone()['count']
            
            cursor.close()
            connection.close()
            
            return jsonify({
                "status": "healthy",
                "server_ip": local_ip,
                "client_ip": request.remote_addr,
                "database_stats": {
                    "gas_readings": gas_count,
                    "notifications": notif_count,
                    "sensor_metadata": meta_count
                },
                "endpoints": {
                    "post_data": "/api/data (POST)",
                    "get_data": "/api/data (GET)"
                }
            })
    except Error as e:
        return jsonify({
            "status": "database_error",
            "error": str(e)
        }), 500

@app.route('/api/data', methods=['POST'])
def handle_data():
    client_ip = request.remote_addr
    print(f"\nIncoming connection from: {client_ip}")
    
    if not request.is_json:
        print("Received non-JSON data")
        return jsonify({"error": "Request must be JSON"}), 400
    
    data = request.get_json()
    
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Store in gas_readings (adjust fields according to your table structure)
            if 'gas_value' in data:
                cursor.execute('''
                    INSERT INTO gas_readings 
                    (sensor_id, gas_value, timestamp, ip_address)
                    VALUES (%s, %s, %s, %s)
                ''', (
                    data.get('sensor_id', 'unknown'),
                    data['gas_value'],
                    datetime.now(),
                    client_ip
                ))
            
            # Store in notifications if certain conditions are met
            if 'gas_value' in data and data['gas_value'] > 100:  # Example threshold
                cursor.execute('''
                    INSERT INTO notifications
                    (sensor_id, alert_type, alert_value, timestamp)
                    VALUES (%s, %s, %s, %s)
                ''', (
                    data.get('sensor_id', 'unknown'),
                    'gas_alert',
                    data['gas_value'],
                    datetime.now()
                ))
            
            # Update or insert sensor metadata
            if 'sensor_id' in data:
                cursor.execute('''
                    INSERT INTO sensor_metadata
                    (sensor_id, last_seen, ip_address, firmware_version)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    last_seen = VALUES(last_seen),
                    ip_address = VALUES(ip_address)
                ''', (
                    data['sensor_id'],
                    datetime.now(),
                    client_ip,
                    data.get('firmware_version', 'unknown')
                ))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            print("Successfully stored data in database")
            print("Received data:", data)
            
            return jsonify({
                "status": "success",
                "client_ip": client_ip,
                "received": data,
                "database_status": "stored"
            })
    
    except Error as e:
        print("Database error:", str(e))
        return jsonify({
            "status": "error",
            "message": "Failed to store data in database",
            "error": str(e)
        }), 500

@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Get last 100 gas readings
            cursor.execute('''
                SELECT * FROM gas_readings 
                ORDER BY timestamp DESC 
                LIMIT 100
            ''')
            gas_data = cursor.fetchall()
            
            # Get active notifications
            cursor.execute('''
                SELECT * FROM notifications 
                WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY)
                ORDER BY timestamp DESC
            ''')
            notifications = cursor.fetchall()
            
            # Get sensor metadata
            cursor.execute('SELECT * FROM sensor_metadata')
            sensors = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            return jsonify({
                "gas_readings": gas_data,
                "notifications": notifications,
                "sensor_metadata": sensors,
                "server_status": "running"
            })
    except Error as e:
        return jsonify({
            "status": "error",
            "message": "Failed to retrieve data",
            "error": str(e)
        }), 500

@app.route('/api/network_info')
def network_info():
    import socket
    return jsonify({
        "server_ip": socket.gethostbyname(socket.gethostname()),
        "subnet": "192.168.93.0/24",
        "suggested_esp_ip": "192.168.93.100" 
    })

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP
if __name__ == '__main__':
    local_ip = get_local_ip()
    print(f"\nStarting server on {local_ip}:8000")
    print("Available endpoints:")
    print(f"  http://{local_ip}:8000/api/health")
    print(f"  http://{local_ip}:8000/api/data\n")
    
    app.run(host='0.0.0.0', port=8000, debug=True)