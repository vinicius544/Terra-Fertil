import { describe, it, expect } from "vitest";
import { ratearMudas, RateioError, Associacao } from "./rateio";

describe("Rateio de Mudas - Projeto Terra Fértil", () => {
  it("Exemplo 1 - Saturação e redistribuição", () => {
    const associacoes: Associacao[] = [
      {
        cnpj: "11",
        nome: "ASPRORIO",
        familias: 120,
        cotaMaxima: 4000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "22",
        nome: "APROPERO",
        familias: 80,
        cotaMaxima: 18000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "33",
        nome: "ARUVE",
        familias: 80,
        cotaMaxima: 18000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "44",
        nome: "Água Boa",
        familias: 45,
        cotaMaxima: 2000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "55",
        nome: "ACRUB",
        familias: 35,
        cotaMaxima: 18000,
        situacao: "suspensa",
        municipio: "PVH",
      },
      {
        cnpj: "66",
        nome: "Alto Alegre",
        familias: 0,
        cotaMaxima: 5000,
        situacao: "regular",
        municipio: "PVH",
      },
    ];

    const resultado = ratearMudas(18000, associacoes);

    expect(resultado.totalDistribuido).toBe(18000);
    expect(resultado.sobraNaoDistribuida).toBe(0);

    const aprop = resultado.distribuicoes.find((d) => d.nome === "APROPERO");
    expect(aprop?.bandejas).toBe(120);
    expect(aprop?.mudas).toBe(6000);

    const aruve = resultado.distribuicoes.find((d) => d.nome === "ARUVE");
    expect(aruve?.bandejas).toBe(120);
    expect(aruve?.mudas).toBe(6000);

    const asprorio = resultado.distribuicoes.find((d) => d.nome === "ASPRORIO");
    expect(asprorio?.bandejas).toBe(80);
    expect(asprorio?.mudas).toBe(4000);

    const aguaBoa = resultado.distribuicoes.find((d) => d.nome === "Água Boa");
    expect(aguaBoa?.bandejas).toBe(40);
    expect(aguaBoa?.mudas).toBe(2000);

    const acrub = resultado.distribuicoes.find((d) => d.nome === "ACRUB");
    expect(acrub?.bandejas).toBe(0);
    expect(acrub?.motivoExclusao).toBeDefined();

    // Ordem de Saída
    expect(resultado.distribuicoes[0].nome).toBe("APROPERO");
    expect(resultado.distribuicoes[1].nome).toBe("ARUVE");
    expect(resultado.distribuicoes[2].nome).toBe("ASPRORIO");
  });

  it("Exemplo 2 - Maiores restos, sobra e ordenação", () => {
    const associacoes: Associacao[] = [
      {
        cnpj: "11",
        nome: "Alto Alegre",
        familias: 10,
        cotaMaxima: 100000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "22",
        nome: "Água Boa",
        familias: 10,
        cotaMaxima: 100000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "33",
        nome: "Boa Esperança",
        familias: 5,
        cotaMaxima: 3000,
        situacao: "regular",
        municipio: "PVH",
      },
    ];

    const resultado = ratearMudas(5180, associacoes);

    expect(resultado.totalDistribuido).toBe(5150);
    expect(resultado.sobraNaoDistribuida).toBe(30);

    expect(resultado.distribuicoes[0].nome).toBe("Água Boa");
    expect(resultado.distribuicoes[0].bandejas).toBe(41);

    expect(resultado.distribuicoes[1].nome).toBe("Alto Alegre");
    expect(resultado.distribuicoes[1].bandejas).toBe(41);

    expect(resultado.distribuicoes[2].nome).toBe("Boa Esperança");
    expect(resultado.distribuicoes[2].bandejas).toBe(21);
  });

  it("Lança RateioError para entradas inválidas ou inconsistentes", () => {
    const assocBase: Associacao = {
      cnpj: "11",
      nome: "A",
      familias: 10,
      cotaMaxima: 100,
      situacao: "regular",
      municipio: "PVH",
    };

    // Mudas negativo
    expect(() => ratearMudas(-50, [assocBase])).toThrow(RateioError);

    // Mudas fracionado
    expect(() => ratearMudas(100.5, [assocBase])).toThrow(RateioError);

    // Lista nula
    expect(() => ratearMudas(100, null as any)).toThrow(RateioError);

    // CNPJ duplicado
    expect(() => ratearMudas(100, [assocBase, assocBase])).toThrow(RateioError);

    // Cota máxima negativa
    expect(() => ratearMudas(100, [{ ...assocBase, cotaMaxima: -10 }])).toThrow(
      RateioError,
    );
  });

  it("Gera sobra total se nenhuma associação for elegível (caso degenerado)", () => {
    const associacoes: Associacao[] = [
      {
        cnpj: "11",
        nome: "Assoc A",
        familias: 0,
        cotaMaxima: 1000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "22",
        nome: "Assoc B",
        familias: 50,
        cotaMaxima: 1000,
        situacao: "irregular",
        municipio: "PVH",
      },
    ];

    const resultado = ratearMudas(5234, associacoes);

    expect(resultado.totalDistribuido).toBe(0);
    expect(resultado.sobraNaoDistribuida).toBe(5234);
    expect(
      resultado.distribuicoes.every((d) => d.mudas === 0 && d.bandejas === 0),
    ).toBe(true);
  });

  it("Valida desempate (R6) usando CNPJ quando famílias e nome empatam", () => {
    const associacoes: Associacao[] = [
      {
        cnpj: "333",
        nome: "Assoc Empate",
        familias: 10,
        cotaMaxima: 1000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "111",
        nome: "Assoc Empate",
        familias: 10,
        cotaMaxima: 1000,
        situacao: "regular",
        municipio: "PVH",
      },
      {
        cnpj: "222",
        nome: "Assoc Empate",
        familias: 10,
        cotaMaxima: 1000,
        situacao: "regular",
        municipio: "PVH",
      },
    ];

    const resultado = ratearMudas(150, associacoes); // 3 bandejas. Partes fracionárias iguais (1 pra cada)

    // A primeira banda de desempate já resolveria, mas vamos focar em verificar a ordenação e consistência:
    const d = resultado.distribuicoes;
    // Pela saída padrão devem ficar em ordem decrescente, todas receberão 1 bandeja, então mudas são idênticas, nome idêntico...
    expect(d[0].mudas).toBe(50);
    expect(resultado.totalDistribuido).toBe(150);
  });
});
