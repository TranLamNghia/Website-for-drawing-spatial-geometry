import requests
import os
from dotenv import load_dotenv

load_dotenv()

def test_openrouter_connectivity():
    url = "https://openrouter.ai/api/v1/models"
    api_key = os.getenv("OPENROUTER_QWEN3_APIKEY")
    
    print(f"--- KIỂM TRA KẾT NỐI OPENROUTER ---")
    print(f"URL: {url}")
    print(f"API Key: {api_key[:10]}...{api_key[-5:] if api_key else 'None'}")
    
    try:
        print("\n1. Đang thử gửi request GET tới /models (kiểm tra Internet & DNS)...")
        response = requests.get(url, timeout=10)
        print(f"✅ Kết nối thành công! Status code: {response.status_code}")
        
        print("\n2. Đang kiểm tra quyền truy cập với API Key...")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Geometry Math Engine Test"
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ API Key hợp lệ! Danh sách Model trả về OK.")
        else:
            print(f"❌ API Key có vấn đề. Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ LỖI KẾT NỐI: {str(e)}")
        print("\nGợi ý: Kiểm tra lại Tường lửa (Firewall) hoặc Proxy của máy.")

if __name__ == "__main__":
    test_openrouter_connectivity()
