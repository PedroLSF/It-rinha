const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const port = 9999;

app.use(express.json());

app.post('/pessoas', async (req, res) => {
  try {
    const { apelido, nome, nascimento, stack } = req.body;

    if (!apelido || !nome || !nascimento) {
      return res
        .status(422)
        .json({ error: 'Campos apelido, nome e nascimento são obrigatórios.' });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(nascimento)) {
      return res.status(422).json({
        error: 'Formato de data de nascimento inválido. Use AAAA-MM-DD.',
      });
    }

    let pessoa;
    if (stack && stack.length > 0) {
      pessoa = await prisma.pessoas.create({
        data: {
          apelido,
          nome,
          nascimento,
          stack: {
            create: stack.map((item) => ({ stack: item })),
          },
        },
      });

      pessoa.stack = stack;
    } else {
      pessoa = await prisma.pessoas.create({
        data: {
          apelido,
          nome,
          nascimento,
        },
      });
    }

    return res.status(201).location(`/pessoas/${pessoa.id}`).json(pessoa);
  } catch (error) {
    console.error(error);
    return res
      .status(422)
      .json({ error: 'Campos apelido, nome e nascimento são obrigatórios.' });
  }
});

app.get('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pessoa = await prisma.pessoas.findUnique({
      where: { id },
      select: {
        id: true,
        apelido: true,
        nome: true,
        nascimento: true,
        stack: {
          select: { stack: true },
        },
      },
    });

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }

    const stack = pessoa.stack.map((item) => item.stack);

    const response = {
      id: pessoa.id,
      apelido: pessoa.apelido,
      nome: pessoa.nome,
      nascimento: pessoa.nascimento,
      stack,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar a pessoa.' });
  }
});

app.get('/pessoas', async (req, res) => {
  try {
    const { t } = req.query;

    if (!t) {
      return res
        .status(400)
        .json({ error: 'O parâmetro de consulta "t" é obrigatório.' });
    }

    const pessoas = await prisma.pessoas.findMany({
      where: {
        OR: [
          {
            apelido: {
              contains: t,
            },
          },
          {
            nome: {
              contains: t,
            },
          },
          {
            stack: {
              some: {
                stack: {
                  contains: t,
                },
              },
            },
          },
        ],
      },
      take: 50,
      select: {
        id: true,
        apelido: true,
        nome: true,
        nascimento: true,
        stack: {
          select: { stack: true },
        },
      },
    });

    const resultados = pessoas.map((pessoa) => ({
      id: pessoa.id,
      apelido: pessoa.apelido,
      nome: pessoa.nome,
      nascimento: pessoa.nascimento,
      stack: pessoa.stack.map((item) => item.stack),
    }));

    return res.status(200).json(resultados);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar as pessoas.' });
  }
});

app.get('/contagem-pessoas', async (req, res) => {
  try {
    const count = await prisma.pessoas.count();

    return res.status(200).send(count.toString());
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send('Erro ao buscar o número de registros de pessoas.');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
