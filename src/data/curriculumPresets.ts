import type { CurriculumPreset } from '../types/curriculum';

/**
 * 10 MVP presets for the Korean elementary curriculum.
 *
 * Note: the `Grade` type is restricted to 1~6. For entries that are effectively
 * "전학년 공통" (e.g. `all-seasons-mandala`, `all-emotion-characters`), we use
 * `grade: 3` as a placeholder — the `unitCode` prefix `공통-` is the source of
 * truth for "all grades" semantics, and the CurriculumPresetPicker surfaces
 * a dedicated "전학년" filter chip that matches these entries by id prefix.
 */
export const CURRICULUM_PRESETS: CurriculumPreset[] = [
  {
    id: '3-1-art-our-town',
    grade: 3,
    semester: 1,
    subject: '미술',
    unitTitle: '우리 동네의 모습',
    unitCode: '3-1-미-2',
    thumbnailEmoji: '🏘️',
    suggestedTopics: [
      '우리 동네 시장',
      '동네 놀이터',
      '우리 학교 가는 길',
      '동네 골목',
      '동네 공원',
    ],
    basePrompt:
      'A friendly illustration of a Korean neighborhood scene with houses, small shops, trees, streetlights, and a few people walking along the sidewalk. Composition should feel warm, welcoming, and recognizable to a 3rd grader.',
    styleDirective:
      'Clean cartoon line art with clear outlines, evenly spaced elements, and no perspective distortion. Objects drawn at child-friendly scale.',
    difficulty: 'easy',
    defaultGrid: { n: 2, m: 2 },
    defaultPaper: 'A3',
    defaultOrientation: 'horizontal',
    teachingNote:
      '학생들이 자기 동네의 특징을 관찰하고 이야기 나눈 뒤 색칠하도록 유도하세요. 색칠 전에 "우리 동네에는 무엇이 있나요?" 질문으로 대화를 열 수 있습니다.',
    learningObjectives: [
      '우리 동네의 모습을 관찰하고 표현한다',
      '공간과 장소에 대한 애착을 기른다',
      '선과 형태를 활용해 공간을 구성한다',
    ],
    timeEstimate: 40,
  },
  {
    id: '3-2-art-imagination',
    grade: 3,
    semester: 2,
    subject: '미술',
    unitTitle: '상상 속 세계',
    unitCode: '3-2-미-4',
    thumbnailEmoji: '🌈',
    suggestedTopics: [
      '구름 위의 성',
      '바닷속 왕국',
      '별이 자라는 정원',
      '하늘을 나는 고래',
      '거꾸로 된 숲',
    ],
    basePrompt:
      'A whimsical imaginary world illustration combining unexpected elements such as floating islands, giant flowers, impossible staircases, and friendly fantastical creatures. Dreamlike but clearly structured so the main shapes are easy to color.',
    styleDirective:
      'Storybook line art with bold, confident outlines and large fillable regions. Avoid cross-hatching or tiny textured areas.',
    difficulty: 'medium',
    defaultGrid: { n: 1, m: 1 },
    defaultPaper: 'A3',
    defaultOrientation: 'vertical',
    teachingNote:
      '자유로운 상상을 존중해 주세요. "있을 수 없는 것을 있게 만드는" 연습이 핵심입니다. 시작 전에 2~3가지 상상 요소를 조합하도록 안내하면 도안 활용이 풍부해집니다.',
    learningObjectives: [
      '상상력을 발휘해 자신만의 세계를 표현한다',
      '서로 어울리지 않는 요소를 창의적으로 결합한다',
      '상상한 장면을 그림으로 구체화한다',
    ],
    timeEstimate: 40,
  },
  {
    id: '4-1-art-spring-life',
    grade: 4,
    semester: 1,
    subject: '미술',
    unitTitle: '봄의 생명',
    unitCode: '4-1-미-3',
    thumbnailEmoji: '🌸',
    suggestedTopics: [
      '벚꽃이 핀 거리',
      '새싹과 나비',
      '봄 들판',
      '개구리와 연못',
      '꽃밭과 벌',
    ],
    basePrompt:
      'A springtime scene full of fresh life: blooming flowers, butterflies, sprouting plants, small animals, and gentle sunlight. Composition spread evenly across the page with clear focal points.',
    styleDirective:
      'Natural, organic line art with smooth curves. Each botanical and animal element has a visible outline large enough for colored pencil work.',
    difficulty: 'easy',
    defaultGrid: { n: 2, m: 1 },
    defaultPaper: 'A3',
    defaultOrientation: 'horizontal',
    teachingNote:
      '봄에 관찰한 생명체 이야기를 먼저 나눈 뒤 색칠을 시작하세요. 같은 도안이라도 관찰 대화가 선행되면 표현의 깊이가 달라집니다.',
    learningObjectives: [
      '봄에 볼 수 있는 생명체의 특징을 이해한다',
      '자연 관찰 경험을 미술 표현으로 연결한다',
      '계절감을 색과 형태로 나타낸다',
    ],
    timeEstimate: 40,
  },
  {
    id: '4-2-art-heritage-mandala',
    grade: 4,
    semester: 2,
    subject: '미술',
    unitTitle: '전통 문화 만다라',
    unitCode: '4-2-미-5',
    thumbnailEmoji: '🏮',
    suggestedTopics: [
      '한옥 지붕 문양',
      '전통 보자기 패턴',
      '청사초롱',
      '단청 문양',
      '태극 문양',
    ],
    basePrompt:
      'A symmetric mandala composed of Korean traditional motifs such as dancheong patterns, hanji textures, cloud shapes, lotus petals, and bojagi grid work. Radial symmetry centered in the page.',
    styleDirective:
      'Precise geometric line art with radial symmetry. Traditional Korean motifs stylized into clean, fillable shapes.',
    difficulty: 'medium',
    defaultGrid: { n: 1, m: 1 },
    defaultPaper: 'A3',
    defaultOrientation: 'vertical',
    teachingNote:
      '만다라는 집중과 명상의 도구입니다. 학생이 천천히 중심에서 바깥으로 색칠하도록 안내하고, 전통 색채(오방색)를 소개해 확장 활동으로 연결할 수 있습니다.',
    learningObjectives: [
      '우리 전통 문양의 아름다움을 이해한다',
      '대칭 구조를 인식하고 표현한다',
      '전통 문화에 대한 자긍심을 기른다',
    ],
    timeEstimate: 40,
  },
  {
    id: '5-1-sci-ecosystem',
    grade: 5,
    semester: 1,
    subject: '과학',
    unitTitle: '생물과 환경 (생태 포스터)',
    unitCode: '5-1-과-2',
    thumbnailEmoji: '🌱',
    suggestedTopics: [
      '숲 생태계',
      '강과 하천 생태',
      '갯벌 생태',
      '도시 속 생물',
      '먹이 사슬',
    ],
    basePrompt:
      'An educational ecosystem poster showing producers, consumers, and decomposers in a Korean natural habitat. Include labeled-friendly spaces (empty boxes) where a student can later write species names, arrows between organisms, and clear zones for sky, land, and water.',
    styleDirective:
      'Infographic-style line art: clean outlines, distinct regions, arrow connectors drawn as simple hollow shapes. Suitable for a scientific poster layout.',
    difficulty: 'hard',
    defaultGrid: { n: 2, m: 3 },
    defaultPaper: 'A2',
    defaultOrientation: 'horizontal',
    teachingNote:
      '모둠 활동 포스터로 활용하기 좋습니다. 먹이 사슬 화살표 영역은 색칠하지 않고 비워두어 학생이 직접 채워 넣도록 유도하세요. 2차시 연계가 자연스럽습니다.',
    learningObjectives: [
      '생태계의 구성 요소와 상호작용을 설명한다',
      '먹이 사슬과 먹이 그물의 차이를 이해한다',
      '생태계 보전의 필요성을 인식한다',
    ],
    timeEstimate: 80,
  },
  {
    id: '5-2-soc-heritage',
    grade: 5,
    semester: 2,
    subject: '사회',
    unitTitle: '문화유산 장면',
    unitCode: '5-2-사-1',
    thumbnailEmoji: '🏛️',
    suggestedTopics: [
      '경복궁 근정전',
      '석굴암과 불국사',
      '첨성대',
      '수원 화성',
      '종묘 제례',
    ],
    basePrompt:
      'A detailed illustration of a major Korean cultural heritage site with accurate architectural features, surrounding landscape, and period-appropriate visual cues. Maintain historical accuracy in the silhouette and roofline.',
    styleDirective:
      'Architectural line art with careful attention to traditional Korean roof curves, bracket systems (gongpo), and proportional hierarchy. Backgrounds simplified to support the main structure.',
    difficulty: 'medium',
    defaultGrid: { n: 2, m: 2 },
    defaultPaper: 'A3',
    defaultOrientation: 'horizontal',
    teachingNote:
      '문화유산의 역사적 배경을 짧게 소개한 후 색칠을 시작하세요. 색칠 후에는 "이 문화유산이 왜 소중한지" 한 문장으로 정리하는 활동으로 마무리할 수 있습니다.',
    learningObjectives: [
      '우리나라의 대표 문화유산을 이해한다',
      '문화유산에 담긴 조상의 지혜를 발견한다',
      '문화유산 보존의 중요성을 안다',
    ],
    timeEstimate: 40,
  },
  {
    id: '6-1-soc-symbols',
    grade: 6,
    semester: 1,
    subject: '사회',
    unitTitle: '우리나라의 상징',
    unitCode: '6-1-사-2',
    thumbnailEmoji: '🌻',
    suggestedTopics: [
      '태극기와 무궁화',
      '애국가 악보 배경',
      '한글',
      '독도',
      '국새와 국장',
    ],
    basePrompt:
      'A composition centered on a national symbol of Korea (e.g. Taegeukgi, mugunghwa, Hangeul characters, Dokdo islets) arranged with respectful hierarchy. Secondary elements support the main symbol without competing for attention.',
    styleDirective:
      'Dignified line art with balanced composition. Official symbols drawn accurately; decorative frames kept minimal.',
    difficulty: 'medium',
    defaultGrid: { n: 2, m: 2 },
    defaultPaper: 'A3',
    defaultOrientation: 'vertical',
    teachingNote:
      '국가 상징물은 정확히 다루는 것이 중요합니다. 태극기의 4괘 위치, 무궁화 꽃잎 수 등 기본 사실을 먼저 확인하고 색칠하세요.',
    learningObjectives: [
      '우리나라의 상징물의 의미를 이해한다',
      '국가 상징에 담긴 가치를 인식한다',
      '나라 사랑하는 마음을 기른다',
    ],
    timeEstimate: 40,
  },
  {
    id: '6-2-art-future-city',
    grade: 6,
    semester: 2,
    subject: '미술',
    unitTitle: '미래 도시',
    unitCode: '6-2-미-4',
    thumbnailEmoji: '🏙️',
    suggestedTopics: [
      '하늘을 나는 자동차 도시',
      '친환경 수직 정원 도시',
      '해저 도시',
      '우주 정거장 도시',
      '자율주행 교통망',
    ],
    basePrompt:
      'A sophisticated future city illustration featuring skyscrapers with organic curved forms, flying vehicles on defined routes, sky bridges, vertical gardens, and solar panels. Layered depth with foreground/midground/background zones clearly separated.',
    styleDirective:
      'Complex architectural line art with high detail density. Geometric precision in the built environment, softer curves for vegetation and vehicles. Designed for advanced colorists.',
    difficulty: 'hard',
    defaultGrid: { n: 3, m: 2 },
    defaultPaper: 'A2',
    defaultOrientation: 'horizontal',
    teachingNote:
      '미래 사회의 과제(환경, 교통, 에너지)와 연결해 토의를 먼저 진행하세요. 학생들이 상상한 해법이 도안 위에 드러나도록 지도하면 융합 수업이 됩니다.',
    learningObjectives: [
      '미래 사회의 모습을 상상하고 표현한다',
      '지속 가능한 도시의 조건을 탐색한다',
      '복합적 구조물을 시각적으로 구성한다',
    ],
    timeEstimate: 80,
  },
  {
    id: 'all-seasons-mandala',
    grade: 3,
    semester: 1,
    subject: '미술',
    unitTitle: '계절 만다라',
    unitCode: '공통-미-1',
    thumbnailEmoji: '❄️',
    suggestedTopics: ['봄 만다라', '여름 만다라', '가을 만다라', '겨울 만다라'],
    basePrompt:
      'A symmetric seasonal mandala that can represent any of the four seasons through its motifs — cherry blossoms for spring, sun rays and waves for summer, leaves and grain for autumn, snowflakes and bare branches for winter. Radial symmetry from the center.',
    styleDirective:
      'Radial mandala line art. Motifs stylized into clean repeating units, each petal ring large enough to color distinctly.',
    difficulty: 'medium',
    defaultGrid: { n: 2, m: 2 },
    defaultPaper: 'A4',
    defaultOrientation: 'vertical',
    teachingNote:
      '전학년 공통으로 활용 가능한 도안입니다. 저학년은 한 계절만, 고학년은 사분면마다 다른 계절을 배치해 색칠하도록 차등 지도할 수 있습니다.',
    learningObjectives: [
      '사계절의 특징을 시각 요소로 표현한다',
      '대칭과 반복의 조형 원리를 이해한다',
      '집중력과 정서적 안정을 기른다',
    ],
    timeEstimate: 40,
  },
  {
    id: 'all-emotion-characters',
    grade: 3,
    semester: 1,
    subject: '도덕',
    unitTitle: '감정 캐릭터',
    unitCode: '공통-도-1',
    thumbnailEmoji: '😊',
    suggestedTopics: ['기쁨', '슬픔', '화남', '두려움', '설렘', '평온'],
    basePrompt:
      'A set of friendly emotion characters expressing different feelings (joy, sadness, anger, fear, excitement, calm). Each character has a clearly readable facial expression and body posture. Characters arranged in a balanced grid or circle composition.',
    styleDirective:
      'Cute, rounded cartoon line art. Big expressive eyes, simple body shapes, thick outlines suitable for young children.',
    difficulty: 'easy',
    defaultGrid: { n: 1, m: 1 },
    defaultPaper: 'A4',
    defaultOrientation: 'vertical',
    teachingNote:
      '감정을 말로 표현하기 어려운 학생에게 특히 유용합니다. 색칠 전에 "오늘 내 기분은 어떤 캐릭터일까?" 물어보고, 색칠 후 자기 감정을 공유하는 활동으로 이어가세요.',
    learningObjectives: [
      '자신과 타인의 감정을 인식한다',
      '감정을 다양한 방법으로 표현한다',
      '정서적 공감 능력을 기른다',
    ],
    timeEstimate: 40,
  },
];
