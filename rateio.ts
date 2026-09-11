export const MUDAS_POR_BANDEJA = 50;

export type SituacaoCadastral = "regular" | "suspensa" | "irregular";

export interface Associacao {
  cnpj: string;
  nome: string;
  municipio: string;
  familias: number;
  cotaMaxima: number;
  situacao: SituacaoCadastral;
}

export interface Distribuicaos {
  cnpj: string;
  nome: string;
  bandejas: number;
  mudas: number;
  motivoExclusao?: string;
}

export type Distribuicao = Distribuicaos;

export interface ResultadoRateio {
  distribuicoes: Distribuicao[];
  totalDistribuido: number;
  sobraNaoDistribuida: number;
}

export class RateioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateioError";
  }
}

export function calcularRateio(
  totalMudas: number,
  associacoes: Associacao[],
): ResultadoRateio {
  if (
    typeof totalMudas !== "number" ||
    !Number.isInteger(totalMudas) ||
    totalMudas < 0
  ) {
    throw new RateioError(
      "Total de mudas deve ser um número inteiro não negativo.",
    );
  }
  if (!associacoes || !Array.isArray(associacoes)) {
    throw new RateioError("A lista de associações fornecida é inválida.");
  }

  const cnpjsVerificados = new Set<string>();

  for (const assoc of associacoes) {
    if (
      !assoc.cnpj ||
      typeof assoc.cnpj !== "string" ||
      !assoc.nome ||
      typeof assoc.nome !== "string"
    ) {
      throw new RateioError(
        "Associação malformada: CNPJ e nome são propriedades obrigatórias.",
      );
    }
    if (
      typeof assoc.familias !== "number" ||
      !Number.isInteger(assoc.familias) ||
      assoc.familias < 0
    ) {
      throw new RateioError(
        `A associação ${assoc.nome} possui um número de famílias inválido.`,
      );
    }
    if (
      typeof assoc.cotaMaxima !== "number" ||
      !Number.isInteger(assoc.cotaMaxima) ||
      assoc.cotaMaxima < 0
    ) {
      throw new RateioError(
        `A associação ${assoc.nome} possui uma cota máxima inválida.`,
      );
    }
    if (!["regular", "suspensa", "irregular"].includes(assoc.situacao)) {
      throw new RateioError(
        `A associação ${assoc.nome} possui uma situação cadastral inválida.`,
      );
    }
    if (cnpjsVerificados.has(assoc.cnpj)) {
      throw new RateioError(
        `O CNPJ ${assoc.cnpj} está duplicado na lista de associações.`,
      );
    }
    cnpjsVerificados.add(assoc.cnpj);
  }

  const mapResultado = new Map<string, Distribuicao>();
  type AssociacaoInterna = Associacao & {
    maxBandejas: number;
    bandejasAlocadas: number;
  };
  const elegiveis: AssociacaoInterna[] = [];

  for (const assoc of associacoes) {
    if (assoc.situacao !== "regular") {
      mapResultado.set(assoc.cnpj, {
        cnpj: assoc.cnpj,
        nome: assoc.nome,
        bandejas: 0,
        mudas: 0,
        motivoExclusao: `Excluída devido à situação cadastral: ${assoc.situacao}`,
      });
    } else if (assoc.familias <= 0) {
      mapResultado.set(assoc.cnpj, {
        cnpj: assoc.cnpj,
        nome: assoc.nome,
        bandejas: 0,
        mudas: 0,
        motivoExclusao: "Associação não possui famílias associadas",
      });
    } else {
      elegiveis.push({
        ...assoc,
        maxBandejas: Math.floor(assoc.cotaMaxima / MUDAS_POR_BANDEJA),
        bandejasAlocadas: 0,
      });
    }
  }

  const saturadas = new Set<string>();
  let requerNovaRodada = true;
  const totalBandejasLote = Math.floor(totalMudas / MUDAS_POR_BANDEJA);

  while (requerNovaRodada) {
    requerNovaRodada = false;
    let poolBandejas = totalBandejasLote;

    for (const assoc of elegiveis) {
      if (saturadas.has(assoc.cnpj)) {
        poolBandejas -= assoc.maxBandejas;
        assoc.bandejasAlocadas = assoc.maxBandejas;
      } else {
        assoc.bandejasAlocadas = 0;
      }
    }

    const ativas = elegiveis.filter((a) => !saturadas.has(a.cnpj));
    if (ativas.length === 0 || poolBandejas <= 0) {
      break;
    }

    const somaFamilias = ativas.reduce((acc, a) => acc + a.familias, 0);

    const alocacoes = ativas.map((assoc) => {
      const numerador = poolBandejas * assoc.familias;
      const parteInteira = Math.floor(numerador / somaFamilias);
      const resto = numerador % somaFamilias;
      return { assoc, parteInteira, resto };
    });

    const totalAlocadoBase = alocacoes.reduce(
      (acc, a) => acc + a.parteInteira,
      0,
    );
    const bandejasRestantes = poolBandejas - totalAlocadoBase;

    alocacoes.sort((a, b) => {
      if (b.resto !== a.resto) {
        return b.resto - a.resto;
      }
      if (a.assoc.familias !== b.assoc.familias) {
        return a.assoc.familias - b.assoc.familias;
      }
      const cmpNome = a.assoc.nome.localeCompare(b.assoc.nome, "pt-BR");
      if (cmpNome !== 0) {
        return cmpNome;
      }
      const c1 = a.assoc.cnpj.replace(/\D/g, "");
      const c2 = b.assoc.cnpj.replace(/\D/g, "");
      if (c1.length !== c2.length) return c1.length - c2.length;
      return c1.localeCompare(c2);
    });

    for (let i = 0; i < bandejasRestantes; i++) {
      alocacoes[i].parteInteira += 1;
    }

    for (const aloc of alocacoes) {
      aloc.assoc.bandejasAlocadas = aloc.parteInteira;
    }

    for (const assoc of ativas) {
      if (assoc.bandejasAlocadas > assoc.maxBandejas) {
        saturadas.add(assoc.cnpj);
        requerNovaRodada = true;
      }
    }
  }

  let totalDistribuidoMudas = 0;

  for (const assoc of elegiveis) {
    const mudas = assoc.bandejasAlocadas * MUDAS_POR_BANDEJA;
    totalDistribuidoMudas += mudas;

    mapResultado.set(assoc.cnpj, {
      cnpj: assoc.cnpj,
      nome: assoc.nome,
      bandejas: assoc.bandejasAlocadas,
      mudas: mudas,
    });
  }

  const sobraNaoDistribuida = totalMudas - totalDistribuidoMudas;

  if (totalDistribuidoMudas + sobraNaoDistribuida !== totalMudas) {
    throw new RateioError("Erro interno grave: a invariante não foi mantida.");
  }

  const distribuicoes = Array.from(mapResultado.values());
  distribuicoes.sort((a, b) => {
    if (a.mudas !== b.mudas) {
      return b.mudas - a.mudas;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return {
    distribuicoes,
    totalDistribuido: totalDistribuidoMudas,
    sobraNaoDistribuida,
  };
}
