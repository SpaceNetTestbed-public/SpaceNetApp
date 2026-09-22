FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y mininet iproute2 net-tools sudo iputils-ping iptables

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

EXPOSE 5000

CMD ["flask", "run", "--reload"]