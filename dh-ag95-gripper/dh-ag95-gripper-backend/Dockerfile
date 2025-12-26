FROM python:3.11-alpine

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

ENV APP_NAME="dh-ag95-gripper"
WORKDIR /usr/local/src/${APP_NAME}
COPY src .

ENTRYPOINT ["python", "dh-ag95-gripper.py"]

EXPOSE 40405
