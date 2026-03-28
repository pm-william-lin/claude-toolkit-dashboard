FROM node:22-alpine
WORKDIR /app
COPY index.html styles.css data.json usage.json ./
COPY js/ ./js/
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", ".", "-p", "8080"]
