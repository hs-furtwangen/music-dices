const tempo = 128;
const ticksPerMeasure = 16;
const measuresInPattern = 4;
const quantization = 60 / (tempo * ticksPerMeasure);
const duration = quantization * ticksPerMeasure * ticksPerMeasure;

export default {
  duration: duration,
  quantization: quantization,
  sounds: [
    [
      'sounds/drums-1.wav',
      'sounds/drums-2.wav',
      'sounds/drums-3.wav',
      'sounds/drums-4.wav',
      'sounds/drums-5.wav',
      'sounds/drums-6.wav',
    ],
    [
      'sounds/lead-1.wav',
      'sounds/lead-2.wav',
      'sounds/lead-3.wav',
      'sounds/lead-4.wav',
      'sounds/lead-5.wav',
      'sounds/lead-6.wav',
    ],
    [
      'sounds/rhythm-1.wav',
      'sounds/rhythm-2.wav',
      'sounds/rhythm-3.wav',
      'sounds/rhythm-4.wav',
      'sounds/rhythm-5.wav',
      'sounds/rhythm-6.wav',
    ],
  ]
};