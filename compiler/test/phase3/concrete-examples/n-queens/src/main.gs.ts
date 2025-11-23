const nQueens = (N: number) => {
  const board = new Array<number>();

  const clear = () => {
    for (let i = 0; i < N * N; i++) board[i] = 0;
  };

  const set = (id: number, x: number, y: number) => {
    board[x + (y * N)] = id;
  };

  const get = (x: number, y: number) => {
    return board[x + (y * N)];
  };

  const checkD1 = (x: number, y: number): boolean => {
    while (x > 0 && y > 0) {
      x--; y--;
    }
    while (x < N && y < N) {
      if (get(x, y) !== 0) {
        return false;
      }
      x++; y++;
    }
    return true;
  };

  const checkD2 = (x: number, y: number): boolean => {
    while (x > 0 && y < (N - 1)) {
      x--; y++;
    }
    while (x < N && y >= 0) {
      if (get(x, y) !== 0) {
        return false;
      }
      x++; y--;
    }
    return true;
  };

  const check = (x: number, y: number): boolean => {
    for (let i = 0; i < N; i++) {
      if (get(i, y) !== 0) {
        return false;
      }
      if (get(x, i) !== 0) {
        return false;
      }
    }
    return checkD1(x, y) && checkD2(x, y);
  };

  const place = (id: number): boolean => {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        if (check(x, y)) {
          set(id, x, y);
          if (id < N) {
            if (place(id + 1)) {
              return true;
            }
          } else {
            return true;
          }
          set(0, x, y);
        }
      }
    }
    return false;
  };

  const dump = () => {
    for (let n = 0; n < N; n++) {
      let i = n * N;
      console.log(board.slice(i, i + N).map(
        x => `${x > 0 ? String.fromCharCode(96 + x) : '•'}`).join(' ')
      );
    }
  };

  clear();
  if (place(1)) {
    dump();
  } else {
    console.log('failed');
  }
};

nQueens(12);
