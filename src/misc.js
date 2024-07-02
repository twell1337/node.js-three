export function ClipForObject(object, animations) {
    // Перебираем все анимационные клипы
    for (var i = 0; i < animations.length; i++) {
        var clip = animations[i];
        // Проверяем, есть ли в анимационных треках объект
        var tracks = clip.tracks;
        for (var j = 0; j < tracks.length; j++) {
            var track = tracks[j];
            // Проверяем, является ли текущий объект целевым объектом трека
            if (track && track.name.startsWith(object.name)) {
                return clip; // Нашли клип, к которому принадлежит объект
            }
        }
    }
    return null;
}