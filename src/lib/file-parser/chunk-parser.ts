import Papa from 'papaparse';

/**
 * PapaParseを利用して、巨大なファイルをワーカー＆チャンク単位で読み込むユーティリティ。
 * UIフリーズを防ぎつつ、DBへのバルクインサートを行えるようにする。
 */
export async function parseFileInChunks<T>(
  file: File,
  onChunk: (results: Papa.ParseResult<T>, parser: Papa.Parser) => Promise<void>,
  options: Omit<Papa.ParseConfig<T>, 'chunk' | 'complete' | 'error'> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    let hasError = false;

    Papa.parse<T>(file, {
      ...(options as Papa.ParseConfig<T>),
      // @ts-ignore papaparseの型定義に標準でexportされていない場合があるが機能は存在する
      encoding: (options as any).encoding || 'Shift-JIS',
      // worker: true だと FileReaderSync を内部で使い、pause/resume が Not Implemented エラーになるため、
      // メインスレッドで chunk ごとに pause() しながら非同期(イベントループ解放)で処理する。
      worker: false,
      skipEmptyLines: true,
      chunk: async (results, parser) => {
        // DBへのインサートが追いつかなくなるのを防ぐため一時停止
        parser.pause();
        try {
          if (!hasError) {
            await onChunk(results, parser);
          }
        } catch (err) {
          hasError = true;
          parser.abort();
          reject(err);
        } finally {
          // メインスレッドのフリーズ（カクつき）を防ぐため、
          // タイマーを使って次のチャンク処理をイベントループの次に回す
          if (!hasError) {
            setTimeout(() => {
              parser.resume();
            }, 0);
          }
        }
      },
      complete: () => {
        if (!hasError) {
          resolve();
        }
      },
      error: (error: Error) => {
        if (!hasError) {
          hasError = true;
          reject(error);
        }
      },
    });
  });
}
