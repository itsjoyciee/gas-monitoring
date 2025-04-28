from datetime import datetime
import json

class APIHandler:
    def __init__(self, database):
        self.db = database

    async def handle_history_request(self, date):
        readings = self.db.get_readings_by_date(date)
        formatted_readings = []
        
        for reading in readings:
            formatted_readings.append({
                'timestamp': reading[1],
                'co': reading[2],
                'co2': reading[3],
                'so2': reading[4],
                'ch4': reading[5],
                'butane': reading[6],
                'lpg': reading[7],
                'smoke': reading[8]
            })
            
        return json.dumps({'readings': formatted_readings})

    async def handle_esp32_data(self, data):
        self.db.save_reading(data)
        return data