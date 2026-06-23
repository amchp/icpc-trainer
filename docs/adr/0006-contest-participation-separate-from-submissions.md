# Keep contest participation separate from submissions

QOJ exposes reliable user contest participation but weaker contest-scoped problem submission data, while Codeforces exposes both contest and problem identity. We store contest-level participation separately from strict problem-level submissions so Contest Finder can work across judges without creating fake or nullable submissions.
