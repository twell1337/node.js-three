const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешить доступ к статическим файлам из папки dist
app.use(express.static(path.join(__dirname, '/dist')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// Отправка главной HTML страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/src/index.html'));
});

// Webpack в режиме наблюдения за изменениями main.js


// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
