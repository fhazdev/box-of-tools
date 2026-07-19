# Local testing image: builds the Astro site and serves it with the Azure Static
# Web Apps CLI emulator (respects staticwebapp.config.json if one is added to public/).
# For day-to-day development use `npm run dev` on the host instead.

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm install -g @azure/static-web-apps-cli

COPY . .
RUN npm run build

EXPOSE 4280

CMD ["swa", "start", "dist", "--host", "0.0.0.0", "--port", "4280"]
