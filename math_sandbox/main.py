from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os
import tempfile
import json
import traceback
from datetime import datetime
import time

app = FastAPI(title="Math Sandbox (SymPy Code Interpreter)")

class ExecutionRequest(BaseModel):
    code: str

@app.post("/execute")
async def execute_code(request: ExecutionRequest):
    code = request.code
    
    # Ghi lại file chạy vào sympyBin theo dạng mới để không bị ghi đè
    try:
        # Trong Docker, sympyBin đã được mount vào /app/sympyBin
        bin_dir = "/app/sympyBin"
        if not os.path.exists(bin_dir):
            os.makedirs(bin_dir)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        debug_filename = f"script_{timestamp}.py"
        debug_path = os.path.join(bin_dir, debug_filename)
        
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(code)
        
        # Vẫn ghi 1 file last_script.py cho tiện
        with open(os.path.join(bin_dir, "last_script.py"), "w", encoding="utf-8") as f:
            f.write(code)
            
        print(f"[DEBUG] Script saved to {debug_path}")
    except Exception as e:
        print(f"[WARN] Can't save debug script to sympyBin: {e}")

    print("--- GENERATED CODE ---")
    print(code)
    print("----------------------")

    # Create temp environment to run code safely
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "script.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        try:
            # Chạy file với timeout 15 giây
            result = subprocess.run(
                ["python", file_path],
                capture_output=True,
                text=True,
                timeout=15,
                check=False
            )
            
            if result.returncode != 0:
                print(f"[SANDBOX ERROR] STDERR: {result.stderr}")
                raise HTTPException(status_code=400, detail=f"Script error: {result.stderr}")
                
            stdout_str = result.stdout.strip()
            try:
                json_start = stdout_str.find("{")
                json_end = stdout_str.rfind("}") + 1
                if json_start != -1 and json_end != -1:
                    clean_json_str = stdout_str[json_start:json_end]
                    points_data = json.loads(clean_json_str)

                    # Save result to JSON file in sympyBin for tracking
                    try:
                        res_filename = f"result_{timestamp}.json"
                        res_path = os.path.join(bin_dir, res_filename)
                        with open(res_path, "w", encoding="utf-8") as f:
                            json.dump(points_data, f, indent=4)
                        print(f"[DEBUG] Result saved to {res_path}")
                    except Exception as e:
                        print(f"[WARN] Can't save result JSON: {e}")

                    return {"status": "success", "data": points_data}
                else:
                    return {"status": "error", "message": "Can't find valid JSON output from script", "stdout": stdout_str}
            except json.JSONDecodeError:
                return {"status": "error", "message": "Output is not in JSON format", "stdout": stdout_str}
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=408, detail="Script running time exceeded 15s (Timeout)")
            
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"System error running sandbox: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
