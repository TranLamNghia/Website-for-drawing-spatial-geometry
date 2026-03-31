FROM python:3.10-alpine

# Set port
EXPOSE 8002

# Set library
WORKDIR /app

# Copy requirement and install libs
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a user without root permissions 
RUN adduser -D sandboxuser
USER sandboxuser

# Copy source code FastAPI (main.py) into Container
COPY . .

# Run FastAPI through Uvicorn when container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
