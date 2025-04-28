# config.py
import os

class Config:
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'gas_monitoring')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))

    # In config.py
class Database:
    def __init__(self):
        self.config = {
            'host': 'localhost',
            'user': 'root',  # or your username
            'password': '',  # Empty password
            'database': 'gas_monitoring'
        }
        self.conn = None
        self.connect()