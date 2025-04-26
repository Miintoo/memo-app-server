const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "minto",
  database: "memo_app",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL 연결 실패", err);
    return;
  }

  console.log("MySQL 연결 성공");

  app.listen(3000, () => {
    console.log("Server is running");
  });
});

// 메모 작성
app.post("/memos", (req, res) => {
  const { content, is_private, password } = req.body;

  if (!content) {
    return res.status(400).json({ message: "content 값이 없어요." });
  }

  if (is_private && !password) {
    return res.status(400).json({ message: "비공개 암호는 암호가 필요해요." });
  }

  const sql = `insert into memo (content, is_private, password) values (?, ?, ?)`;

  db.query(sql, [content, is_private, password], (err, result) => {
    if (err) {
      console.error("DB 저장 실패", err);
      return res.status(500).json({ message: "DB 저장 실패" });
    }

    res.status(201).json({ message: "메모 저장 완료", id: result.insertId });
  });
});

// 메모 검색
app.get("/memos/search", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ message: "검색어가 없습니다." });
  }

  const sql = `select * from memo where content like ?`;

  db.query(sql, [`%${keyword}%`], (err, result) => {
    if (err) {
      console.error("검색 실패", err);
      return res.status(500).json({ message: "검색 실패" });
    }

    res.status(200).json(result);
  });
});

// 메모 조회
app.get("/memos", (req, res) => {
  const sql = `select * from memo`;

  db.query(sql, [], (err, result) => {
    if (err) {
      console.error("메모 조회 실패", err);
      return res.status(500).json({ message: "메모 조회 실패" });
    }

    res.status(200).json(result);
  });
});

// 메모 편집
app.post("/memos/:id", (req, res) => {
  const id = req.params.id;
  const { content } = req.body;

  const sql = `update memo set content = ? where id = ?`;
  db.query(sql, [content, id], (err, result) => {
    if (err) {
      console.error("메모 수정 실패", err);
      return res.status(500).json({ message: "메모 수정 실패" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "해당 메모를 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "메모 수정 성공" });
  });
});

// 메모 삭제
app.delete("/memos/:id", (req, res) => {
  const id = req.params.id;

  const sql = `delete from memo where id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("서버 에러", err);
      return res.status(500).json({ message: "메모 삭제 실패" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "아이디에 맞는 메모가 없습니다." });
    }

    res.status(200).json({ message: "메모 삭제 성공" });
  });
});

// 비공개 전환
app.post("/memos/:id/visibility", (req, res) => {
  const id = req.params.id;
  const { is_private, password } = req.body;

  // 공개로 전환
  if (!is_private) {
    const sql = `select password from memo where id = ?`;
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("비밀번호 찾기 실패", err);
        return res.status(500).json({ message: "서버 에러" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "서버에 해당하는 메모가 없습니다." });
      }

      // 입력받은 비밀번호와 DB 비밀번호가 다른 경우 삭제
      if (result[0].password !== String(password)) {
        return res.status(403).json({ messsage: "비밀번호가 틀렸습니다." });
      }

      const sql = `update memo set is_private = ?, password = null where id = ?`;
      db.query(sql, [is_private, id], (err, result) => {
        if (err) {
          console.error("공개, 비공개 전환 실패", err);
          return res.status(500).json({ message: "전환 실패" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "해당하는 메모를 찾을 수 없습니다." });
        }

        res.status(200).json({ message: "전환 성공" });
      });
    });
  } else {
    // 비공개로 전환
    const sql = `update memo set is_private = ?, password = ? where id = ?`;
    db.query(sql, [is_private, password, id], (err, result) => {
      if (err) {
        console.error("공개, 비공개 전환 실패", err);
        return res.status(500).json({ message: "전환 실패" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "해당하는 메모를 찾을 수 없습니다." });
      }

      res.status(200).json({ message: "전환 성공" });
    });
  }
});
