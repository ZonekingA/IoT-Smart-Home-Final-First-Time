import time
from pymodbus.client import ModbusSerialClient

# 🔧 ตั้งค่าพอร์ตและพารามิเตอร์ของ Modbus RTU
PORT = "COM4"  # เปลี่ยนให้ตรงกับพอร์ตของคุณ
BAUDRATE = 9600
TIMEOUT = 3  # เพิ่มเวลา Timeout
PARITY = 'N'  # อาจต้องลอง 'E' หรือ 'O' ถ้าอ่านค่าไม่ได้
STOPBITS = 1
BYTESIZE = 8

SCAN_SLAVE_ID_RANGE = range(1, 10)  # สแกน ID ตั้งแต่ 1-9
SCAN_REGISTERS_RANGE = range(0, 20)  # สแกน Register ตั้งแต่ 0-19

# 🔗 ตั้งค่า Modbus Client
client = ModbusSerialClient(
    port=PORT, baudrate=BAUDRATE, timeout=TIMEOUT, 
    stopbits=STOPBITS, bytesize=BYTESIZE, parity=PARITY
)

# 🚀 เปิดการเชื่อมต่อ
if not client.connect():
    print("❌ ไม่สามารถเชื่อมต่อกับ Modbus RTU")
    exit()

print(f"✅ เชื่อมต่อสำเร็จ! กำลังค้นหาอุปกรณ์ Modbus บน {PORT}...\n")

# 🔎 ค้นหา Slave ID ที่ใช้งานอยู่
found_slaves = []
for slave_id in SCAN_SLAVE_ID_RANGE:
    print(f"🔍 กำลังตรวจสอบ Slave ID: {slave_id} ...", end=" ")

    try:
        result = client.read_holding_registers(address=0, count=1, slave=slave_id)  # ใช้ kwargs
        if result and not result.isError():
            print(f"✅ พบอุปกรณ์! 🎯 (Slave ID: {slave_id})")
            found_slaves.append(slave_id)
        else:
            print("❌ ไม่พบ")
    except Exception as e:
        print(f"⚠️ ข้อผิดพลาด: {e}")

if not found_slaves:
    print("\n🚫 ไม่พบอุปกรณ์ Modbus ใดๆ ในช่วงที่กำหนด")
    client.close()
    exit()

# 🔎 ค้นหา Register Address ที่ใช้งานได้
for slave_id in found_slaves:
    print(f"\n🔎 กำลังสแกน Register สำหรับ Slave ID: {slave_id}...\n")

    for reg in SCAN_REGISTERS_RANGE:
        print(f"  📡 ตรวจสอบ Register {reg}...", end=" ")

        try:
            result = client.read_holding_registers(address=reg, count=1, slave=slave_id)  # ใช้ kwargs
            if result and not result.isError():
                print(f"✅ พบ! 📌 Register Address: {reg} (ค่า: {result.registers[0]})")
            else:
                print("❌ ไม่พบ")
        except Exception as e:
            print(f"⚠️ ข้อผิดพลาด: {e}")

# 🔌 ปิดการเชื่อมต่อ
client.close()
print("\n✅ การสแกนเสร็จสิ้น!")
