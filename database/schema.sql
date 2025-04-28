# config.py
import mysql.connector
from mysql.connector import Error
from datetime import datetime

class Database:
    def __init__(self, host='localhost', user='app_user', password='secure_password', database='gas_monitoring'):
        self.config = {
            'host': host,
            'user': user,
            'password': password,
            'database': database,
            'raise_on_warnings': True
        }
        self.conn = None
        self.connect()
        self.create_tables()

    def connect(self):
        try:
            self.conn = mysql.connector.connect(**self.config)
            print("Successfully connected to MySQL database")
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            raise

    def create_tables(self):
        cursor = self.conn.cursor(dictionary=True)

        # Table for sensor metadata (created first due to foreign key relationship)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        ''')

        # Table for gas readings
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS gas_readings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sensor_id INT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                co FLOAT DEFAULT 0,
                co2 FLOAT DEFAULT 0,
                so2 FLOAT DEFAULT 0,
                ch4 FLOAT DEFAULT 0,
                butane FLOAT DEFAULT 0,
                lpg FLOAT DEFAULT 0,
                smoke FLOAT DEFAULT 0,
                FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
                INDEX (sensor_id),
                INDEX (timestamp)
            ) ENGINE=InnoDB
        ''')

        # Table for threshold alerts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reading_id INT NOT NULL,
                gas_type ENUM('co', 'co2', 'so2', 'ch4', 'butane', 'lpg', 'smoke') NOT NULL,
                gas_value FLOAT NOT NULL,
                threshold FLOAT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_acknowledged BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (reading_id) REFERENCES gas_readings(id) ON DELETE CASCADE,
                INDEX (reading_id),
                INDEX (gas_type),
                INDEX (is_acknowledged)
            ) ENGINE=InnoDB
        ''')

        self.conn.commit()
        cursor.close()

    def save_reading(self, sensor_id, data):
        cursor = self.conn.cursor(dictionary=True)
        
        try:
            # Insert the gas reading
            cursor.execute('''
                INSERT INTO gas_readings 
                (sensor_id, co, co2, so2, ch4, butane, lpg, smoke)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                sensor_id,
                data.get('co', 0),
                data.get('co2', 0),
                data.get('so2', 0),
                data.get('ch4', 0),
                data.get('butane', 0),
                data.get('lpg', 0),
                data.get('smoke', 0)
            ))
            
            reading_id = cursor.lastrowid
            
            # Check for threshold alerts (example thresholds)
            thresholds = {
                'co': 50,    # ppm
                'co2': 5000, # ppm
                'so2': 20,   # ppm
                'smoke': 100 # ppm
            }
            
            for gas, value in data.items():
                if gas in thresholds and value > thresholds[gas]:
                    cursor.execute('''
                        INSERT INTO alerts 
                        (reading_id, gas_type, gas_value, threshold)
                        VALUES (%s, %s, %s, %s)
                    ''', (reading_id, gas, value, thresholds[gas]))
            
            self.conn.commit()
            return reading_id
            
        except Error as e:
            self.conn.rollback()
            raise Exception(f"Database error: {e}")
        finally:
            cursor.close()

    def get_readings(self, sensor_id=None, start_date=None, end_date=None, limit=100):
        cursor = self.conn.cursor(dictionary=True)
        
        query = "SELECT * FROM gas_readings"
        params = []
        conditions = []
        
        if sensor_id:
            conditions.append("sensor_id = %s")
            params.append(sensor_id)
            
        if start_date:
            conditions.append("timestamp >= %s")
            params.append(start_date)
            
        if end_date:
            conditions.append("timestamp <= %s")
            params.append(end_date)
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY timestamp DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        return results

    def get_sensors(self):
        cursor = self.conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM sensors")
        results = cursor.fetchall()
        cursor.close()
        return results

    def add_sensor(self, location, description=""):
        cursor = self.conn.cursor(dictionary=True)
        cursor.execute('''
            INSERT INTO sensors (location, description)
            VALUES (%s, %s)
        ''', (location, description))
        sensor_id = cursor.lastrowid
        self.conn.commit()
        cursor.close()
        return sensor_id

    def get_alerts(self, acknowledged=None, limit=50):
        cursor = self.conn.cursor(dictionary=True)
        
        query = '''
            SELECT a.*, r.sensor_id, s.location
            FROM alerts a
            JOIN gas_readings r ON a.reading_id = r.id
            JOIN sensors s ON r.sensor_id = s.id
        '''
        params = []
        
        if acknowledged is not None:
            query += " WHERE a.is_acknowledged = %s"
            params.append(acknowledged)
            
        query += " ORDER BY a.timestamp DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        return results

    def acknowledge_alert(self, alert_id):
        cursor = self.conn.cursor(dictionary=True)
        cursor.execute('''
            UPDATE alerts 
            SET is_acknowledged = TRUE 
            WHERE id = %s
        ''', (alert_id,))
        self.conn.commit()
        cursor.close()

    def close(self):
        if self.conn:
            self.conn.close()